const express = require('express');
const router = express.Router();
const PolicyConfig = require('../models/PolicyConfig');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/policy and /api/policy/relief-allocation - Get current policy
const handleGetPolicy = async (req, res) => {
  try {
    let policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    if (!policy) {
      policy = await PolicyConfig.create({ key: 'relief_allocation' });
    }
    res.json(policy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official'), handleGetPolicy);
router.get('/relief-allocation', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official'), handleGetPolicy);

// PUT/POST /api/policy and /api/policy/relief-allocation - Save policy
const handleSavePolicy = async (req, res) => {
  try {
    const fields = req.body || {};
    let policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    if (!policy) {
      policy = new PolicyConfig({ key: 'relief_allocation' });
    }

    if (fields.baseCoverage !== undefined) {
      policy.baseCoverage = Number(fields.baseCoverage);
      try {
        const ReliefItemType = require('../models/ReliefItemType');
        await ReliefItemType.updateMany(
          { category: 'headcount_scaled' },
          { $set: { baseCoverage: Number(fields.baseCoverage) } }
        );
      } catch (e) {}
    }
    if (fields.extraMemberTopUp !== undefined) policy.extraMemberTopUp = Number(fields.extraMemberTopUp);
    if (fields.seniorTopUp !== undefined) policy.seniorTopUp = Number(fields.seniorTopUp);
    if (fields.pwdTopUp !== undefined) policy.pwdTopUp = Number(fields.pwdTopUp);
    if (fields.basePacksPerMember !== undefined) policy.basePacksPerMember = Number(fields.basePacksPerMember);
    if (fields.topUpPregnant !== undefined) policy.topUpPregnant = Number(fields.topUpPregnant);
    if (fields.maxClaimPerHousehold !== undefined) policy.maxClaimPerHousehold = Number(fields.maxClaimPerHousehold);
    if (fields.fraudThreshold !== undefined) policy.fraudThreshold = Number(fields.fraudThreshold);
    if (fields.priorityHighThreshold !== undefined) policy.priorityHighThreshold = Number(fields.priorityHighThreshold);
    if (fields.priorityMedThreshold !== undefined) policy.priorityMedThreshold = Number(fields.priorityMedThreshold);
    if (fields.allowSelfRegistration !== undefined) policy.allowSelfRegistration = Boolean(fields.allowSelfRegistration);
    if (fields.requireIdUpload !== undefined) policy.requireIdUpload = Boolean(fields.requireIdUpload);

    policy.updatedBy = req.user._id;
    policy.updatedAt = new Date();
    await policy.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('policy_updated', policy);
      io.emit('policy_updated', policy);
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_POLICY',
      targetType: 'PolicyConfig',
      targetId: policy._id,
      notes: `Policy updated: baseCoverage=${policy.baseCoverage}, extraMemberTopUp=${policy.extraMemberTopUp}`,
    });

    res.json({ success: true, message: 'Policy configuration updated successfully', policy });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

router.put('/', protect, requireRole('lgu_superadmin', 'lgu_super_admin', 'lgu_admin'), handleSavePolicy);
router.post('/', protect, requireRole('lgu_superadmin', 'lgu_super_admin', 'lgu_admin'), handleSavePolicy);
router.put('/relief-allocation', protect, requireRole('lgu_superadmin', 'lgu_super_admin', 'lgu_admin'), handleSavePolicy);
router.post('/relief-allocation', protect, requireRole('lgu_superadmin', 'lgu_super_admin', 'lgu_admin'), handleSavePolicy);

module.exports = router;
