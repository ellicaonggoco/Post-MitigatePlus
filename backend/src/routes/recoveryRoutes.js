const express = require('express');
const router = express.Router();
const RecoveryStatus = require('../models/RecoveryStatus');
const Household = require('../models/Household');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/recovery - List all recovery statuses with household info
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official', 'field_staff'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.barangayCode) {
      const householdIds = await Household.find({ barangayCode: req.query.barangayCode }).select('_id');
      filter.householdId = { $in: householdIds.map(h => h._id) };
    }

    // Auto-create recovery status for all verified households if missing
    const allVerifiedHouseholds = await Household.find().populate('headOfHouseholdUserId', 'name emailOrPhone');
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
    const { status } = req.body;
    let recovery = await RecoveryStatus.findOne({
      $or: [{ householdId: req.params.householdId }, { _id: req.params.householdId }]
    });
    if (!recovery) {
      recovery = await RecoveryStatus.create({ householdId: req.params.householdId, status, updatedBy: req.user._id });
    } else {
      recovery.status = status;
      recovery.updatedBy = req.user._id;
      recovery.updatedAt = new Date();
      await recovery.save();
    }
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'UPDATE_RECOVERY_STATUS', targetType: 'Household', targetId: req.params.householdId, notes: `Status changed to ${status}` });
    res.json(recovery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
