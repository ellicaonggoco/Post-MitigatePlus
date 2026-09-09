const express = require('express');
const router = express.Router();
const RecoveryStatus = require('../models/RecoveryStatus');
const Household = require('../models/Household');
const Distribution = require('../models/Distribution');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/recovery - List all recovery statuses with household info
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official', 'field_staff'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    let targetBrgy = req.query.barangayCode;
    if (req.user.role === 'barangay_official' && req.user.barangayCode) {
      targetBrgy = req.user.barangayCode;
    }
    if (targetBrgy) {
      const householdIds = await Household.find({ barangayCode: targetBrgy }).select('_id');
      filter.householdId = { $in: householdIds.map(h => h._id) };
    }

    // Ensure all verified households have an initial recovery status record if missing
    const allVerifiedHouseholds = await Household.find(targetBrgy ? { barangayCode: targetBrgy } : {}).select('_id');
    for (const vh of allVerifiedHouseholds) {
      const existing = await RecoveryStatus.findOne({ householdId: vh._id });
      if (!existing) {
        await RecoveryStatus.create({
          householdId: vh._id,
          status: 'waiting',
          updatedBy: req.user._id,
        });
      }
    }

    const statuses = await RecoveryStatus.find(filter)
      .sort({ updatedAt: -1 })
      .populate({ path: 'householdId', populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' } })
      .populate('updatedBy', 'name role');

    const formatted = statuses.map(s => {
      const hh = s.householdId;
      const headName = hh?.headOfHouseholdUserId?.name || hh?.headName || 'Resident Household';
      const address = hh?.address ? `${hh.address}, Purok ${hh.purok || 1} (Brgy ${hh.barangayCode || '291'})` : `Purok 1, Barangay ${hh?.barangayCode || '291'}, Manila`;
      return {
        id: hh?._id ? String(hh._id) : String(s._id),
        _id: s._id,
        householdId: hh?._id ? String(hh._id) : null,
        head: headName,
        address: address,
        barangayCode: hh?.barangayCode || '291',
        members: hh?.memberCount || 1,
        stage: s.status || 'waiting',
        status: s.status || 'waiting',
        updatedAt: s.updatedAt,
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/recovery/:householdId - Update recovery status
router.put('/:householdId', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official', 'field_staff'), async (req, res) => {
  try {
    const { status, householdId: bodyHouseholdId } = req.body;
    const rawId = req.params.householdId;

    const normalizeMap = {
      waiting: 'waiting',
      received: 'assistance_received',
      assistance_received: 'assistance_received',
      ongoing: 'ongoing',
      partial: 'partially_recovered',
      partially_recovered: 'partially_recovered',
      full: 'fully_recovered',
      fully_recovered: 'fully_recovered',
    };
    const validStatus = normalizeMap[status] || status || 'waiting';

    const mongoose = require('mongoose');
    let recovery = null;

    if (mongoose.Types.ObjectId.isValid(rawId)) {
      recovery = await RecoveryStatus.findOne({
        $or: [{ _id: rawId }, { householdId: rawId }]
      });
    }

    if (!recovery && bodyHouseholdId && mongoose.Types.ObjectId.isValid(bodyHouseholdId)) {
      recovery = await RecoveryStatus.findOne({ householdId: bodyHouseholdId });
    }

    if (!recovery) {
      const validHhId = (mongoose.Types.ObjectId.isValid(rawId) ? rawId : null) || (mongoose.Types.ObjectId.isValid(bodyHouseholdId) ? bodyHouseholdId : null);
      if (validHhId) {
        recovery = await RecoveryStatus.create({
          householdId: validHhId,
          status: validStatus,
          updatedBy: req.user._id,
        });
      } else {
        return res.status(404).json({ message: 'Household record not found' });
      }
    } else {
      recovery.status = validStatus;
      recovery.updatedBy = req.user._id;
      recovery.updatedAt = new Date();
      await recovery.save();
    }

    try {
      await AuditLog.create({
        actorUserId: req.user._id,
        actorRole: req.user.role,
        action: 'UPDATE_RECOVERY_STATUS',
        targetType: 'Household',
        targetId: String(recovery.householdId),
        notes: `Status changed to ${validStatus}`,
      });
    } catch (auditErr) {
      console.error('AuditLog error:', auditErr.message);
    }
    
    // Broadcast real-time update to mobile resident & web admin
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${recovery.householdId}`).emit('recovery_status_updated', validStatus);
      io.emit('recovery_updated', { householdId: String(recovery.householdId), status: validStatus });
    }

    res.json({ success: true, status: validStatus, recovery });
  } catch (err) {
    console.error('PUT /api/recovery error:', err);
    res.status(400).json({ message: err.message });
  }
});

// POST /api/recovery/reset-barangay
// Bulk reset all households in a barangay to 'waiting' when a new calamity or typhoon occurs
router.post('/reset-barangay', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official'), async (req, res) => {
  try {
    const { barangayCode, reason } = req.body;
    let targetBrgy = barangayCode;
    if (req.user.role === 'barangay_official' && req.user.barangayCode) {
      targetBrgy = req.user.barangayCode;
    } else if (!targetBrgy) {
      targetBrgy = req.user.barangayCode || '291';
    }

    const households = await Household.find({ barangayCode: targetBrgy }).select('_id');
    const hhIds = households.map(h => h._id);

    if (hhIds.length === 0) {
      return res.status(404).json({ message: `Walang natagpuang households sa Barangay ${targetBrgy}.` });
    }

    // 1. Reset all households in this barangay to 'waiting'
    for (const hid of hhIds) {
      await RecoveryStatus.findOneAndUpdate(
        { householdId: hid },
        {
          $set: {
            status: 'waiting',
            updatedBy: req.user._id,
            updatedAt: new Date(),
          }
        },
        { upsert: true, new: true }
      );
    }

    // 2. Clear past distribution claim records for this barangay so households can claim relief again in the new calamity
    const deletedDistributions = await Distribution.deleteMany({ householdId: { $in: hhIds } });

    // 3. Close any currently active distribution events for this barangay
    const DistributionEvent = require('../models/DistributionEvent');
    await DistributionEvent.updateMany(
      { barangayCode: targetBrgy, isActive: true },
      { $set: { isActive: false, status: 'Completed' } }
    );

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'BULK_RECOVERY_RESET',
      targetType: 'Barangay',
      targetId: String(targetBrgy),
      notes: `Declared new calamity for Barangay ${targetBrgy}. Reset ${hhIds.length} households to 'waiting' and cleared ${deletedDistributions.deletedCount || 0} relief distribution claims for the new calamity cycle. Reason: ${reason || 'New typhoon / calamity relief cycle declaration'}`,
    });

    // 4. Broadcast via WebSockets to mobile apps and web admin
    const io = req.app.get('io');
    if (io) {
      hhIds.forEach(hid => {
        io.to(`household:${hid}`).emit('recovery_status_updated', 'waiting');
        io.to(`household:${hid}`).emit('calamity_declared_reset', { barangayCode: targetBrgy });
      });
      io.to(`brgy:${targetBrgy}`).emit('recovery_status_updated', 'waiting');
      io.emit('barangay_recovery_reset', { barangayCode: targetBrgy, count: hhIds.length });
    }

    res.json({
      success: true,
      message: `Matagumpay na na-reset ang buong Barangay ${targetBrgy}! Lahat ng ${hhIds.length} pamilya ay naibalik sa "Waiting for Ayuda" at na-clear ang mga lumang claim records para sa bagong relief operation!`,
      count: hhIds.length,
      clearedClaimsCount: deletedDistributions.deletedCount || 0,
      barangayCode: targetBrgy,
    });
  } catch (err) {
    console.error('POST /api/recovery/reset-barangay error:', err);
    res.status(500).json({ message: 'Error resetting barangay recovery progress', error: err.message });
  }
});

module.exports = router;

