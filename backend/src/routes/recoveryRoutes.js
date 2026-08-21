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
    const statuses = await RecoveryStatus.find(filter)
      .sort({ updatedAt: -1 })
      .populate({ path: 'householdId', populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' } })
      .populate('updatedBy', 'name role');
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/recovery/:householdId - Update recovery status
router.put('/:householdId', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official', 'field_staff'), async (req, res) => {
  try {
    const { status } = req.body;
    let recovery = await RecoveryStatus.findOne({ householdId: req.params.householdId });
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
