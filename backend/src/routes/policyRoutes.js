const express = require('express');
const router = express.Router();
const PolicyConfig = require('../models/PolicyConfig');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/policy - Get current policy
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official'), async (req, res) => {
  try {
    let policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    if (!policy) {
      policy = await PolicyConfig.create({ key: 'relief_allocation' });
    }
    res.json(policy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/policy - Update policy (SuperAdmin only)
router.put('/', protect, requireRole('lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { baseCoverage, extraMemberTopUp, seniorTopUp, pwdTopUp } = req.body;
    let policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    if (!policy) {
      policy = new PolicyConfig({ key: 'relief_allocation' });
    }
    if (baseCoverage !== undefined) policy.baseCoverage = Number(baseCoverage);
    if (extraMemberTopUp !== undefined) policy.extraMemberTopUp = Number(extraMemberTopUp);
    if (seniorTopUp !== undefined) policy.seniorTopUp = Number(seniorTopUp);
    if (pwdTopUp !== undefined) policy.pwdTopUp = Number(pwdTopUp);
    policy.updatedBy = req.user._id;
    policy.updatedAt = new Date();
    await policy.save();
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'UPDATE_POLICY', targetType: 'PolicyConfig', targetId: policy._id, notes: `Policy updated: base=${baseCoverage}` });
    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
