const express = require('express');
const router = express.Router();
const Household = require('../models/Household');
const Distribution = require('../models/Distribution');
const AssistanceRequest = require('../models/AssistanceRequest');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole, requireBarangayScope } = require('../middleware/auth');
const { calculatePriorityIndex } = require('../utils/priorityIndex');
const { calculateReliefAllocation } = require('../utils/reliefAllocation');
const { detectAssistanceGaps } = require('../utils/gapDetection');

// @route   GET /api/households/pending
// @desc    Get pending verification queue (Barangay official approval queue)
router.get('/pending', protect, requireRole('barangay_official', 'lgu_admin'), requireBarangayScope, async (req, res) => {
  try {
    let query = { verificationStatus: 'pending' };
    
    // Strict scoping for Barangay Official
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode) {
      query.barangayCode = req.query.barangayCode;
    }

    const pendingHouseholds = await Household.find(query)
      .populate('headOfHouseholdUserId', 'name emailOrPhone')
      .populate('linkedHouseholdId', 'address purok memberCount headOfHouseholdUserId')
      .sort({ priorityScore: -1, createdAt: 1 });

    res.json({
      count: pendingHouseholds.length,
      barangayCode: req.user.barangayCode || 'ALL',
      households: pendingHouseholds,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending queue', error: error.message });
  }
});

// @route   POST /api/households/:id/verify
// @desc    Approve / Request Info / Reject a household registration
router.post('/:id/verify', protect, requireRole('barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;
    if (!['verified', 'needs_info', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be verified, needs_info, or rejected.' });
    }

    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ message: 'Household record not found.' });
    }

    // Backend enforcement: Barangay Official can ONLY verify households matching their own barangayCode
    if (req.user.role === 'barangay_official' && household.barangayCode !== req.user.barangayCode) {
      return res.status(403).json({
        message: `Forbidden: You are registered for Barangay ${req.user.barangayCode} and cannot verify a household in Barangay ${household.barangayCode}.`,
      });
    }

    // Handle pending member count and pending member roster updates upon verification
    if (status === 'verified') {
      if (household.memberCountPendingUpdate) {
        household.memberCount = household.memberCountPendingUpdate;
        household.memberCountPendingUpdate = null;
      }
      if (household.pendingMembers && household.pendingMembers.length > 0) {
        household.members = household.pendingMembers;
        household.pendingMembers = [];
      }
    } else if (status === 'rejected') {
      // Revert any pending member update requests
      household.memberCountPendingUpdate = null;
      household.pendingMembers = [];
    }

    household.verificationStatus = status;
    household.verifiedBy = req.user._id;
    household.verifiedAt = new Date();
    household.verificationNotes = verificationNotes || '';

    // Recalculate priority index upon official verification
    const pastDistributionsCount = await Distribution.countDocuments({ householdId: household._id });
    const { priorityScore, priorityLevel } = calculatePriorityIndex(household, household.createdAt, pastDistributionsCount);
    household.priorityScore = priorityScore;
    household.priorityLevel = priorityLevel;

    await household.save();

    // Log audit
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: `VERIFICATION_${status.toUpperCase()}`,
      targetType: 'Household',
      targetId: household._id.toString(),
      notes: `Verified status updated to ${status}. Members: ${household.memberCount}. Notes: ${verificationNotes || 'None'}`,
    });

    // Notify resident via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${household._id}`).emit('verification_updated', {
        verificationStatus: status,
        verificationNotes,
        memberCount: household.memberCount,
        verifiedAt: household.verifiedAt,
      });
    }

    res.json({
      message: `Household verification updated to '${status}'.`,
      household,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing verification', error: error.message });
  }
});

// PUT /api/households/me/members - Request to update household members (requires Barangay Official review)
router.put('/me/members', protect, requireRole('resident'), async (req, res) => {
  try {
    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) return res.status(404).json({ message: 'Household not found' });
    const { members } = req.body;
    if (!Array.isArray(members)) return res.status(400).json({ message: 'Members must be an array' });

    // Anti-Fraud Safeguard:
    // Do NOT directly increase the official memberCount or priority score!
    // Stage the requested members in pendingMembers and alert the Barangay Official.
    const requestedCount = members.length + 1; // +1 for head of household
    household.memberCountPendingUpdate = requestedCount;
    household.pendingMembers = members;
    await household.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: 'resident',
      action: 'REQUEST_MEMBER_UPDATE',
      targetType: 'Household',
      targetId: household._id.toString(),
      notes: `${req.user.name} requested to update household members from ${household.memberCount} to ${requestedCount}. Pending Barangay Official review.`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`barangay:${household.barangayCode}`).emit('household_update_pending', {
        householdId: household._id,
        address: household.address,
        purok: household.purok,
        barangayCode: household.barangayCode,
        currentMemberCount: household.memberCount,
        pendingMemberCount: requestedCount,
      });
    }

    res.json({
      message: 'Naisumite na ang kahilingan sa pagdagdag ng miyembro ng pamilya. Dadaan muna ito sa pagsusuri ng inyong Barangay Official bago ma-update ang inyong opisyal na priority score.',
      household,
      isPendingApproval: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/households/me
// @desc    Get current resident's household details
router.get('/me', protect, requireRole('resident'), async (req, res) => {
  try {
    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) {
      return res.status(404).json({ message: 'No household record linked to this resident account.' });
    }

    const pastRequests = await AssistanceRequest.find({ householdId: household._id });
    const pastDistributions = await Distribution.find({ householdId: household._id });

    const gapAnalysis = detectAssistanceGaps(pastRequests, pastDistributions);

    res.json({
      household,
      gapAnalysis,
      pastRequests,
      pastDistributions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching household details', error: error.message });
  }
});

// @route   GET /api/households/qr/:code
// @desc    Field Staff QR scan lookup endpoint
router.get('/qr/:code', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const household = await Household.findOne({ qrCode: req.params.code })
      .populate('headOfHouseholdUserId', 'name emailOrPhone');

    if (!household) {
      return res.status(404).json({ message: 'Household QR Code not found or invalid.' });
    }

    const pastRequests = await AssistanceRequest.find({ householdId: household._id });
    const pastDistributions = await Distribution.find({ householdId: household._id });

    // Compute standard relief quantity recommendation based on ReliefItemType configs
    const ReliefItemType = require('../models/ReliefItemType');
    const itemConfigs = await ReliefItemType.find({});
    const recommendations = {};

    if (itemConfigs && itemConfigs.length > 0) {
      itemConfigs.forEach((cfg) => {
        recommendations[cfg.name] = calculateReliefAllocation(household.memberCount, cfg.baseCoverage, cfg.category);
      });
    } else {
      recommendations['Family Food Pack'] = calculateReliefAllocation(household.memberCount, 5, 'headcount_scaled');
      recommendations['Hygiene Kit'] = calculateReliefAllocation(household.memberCount, 5, 'headcount_scaled');
    }
    
    const gapAnalysis = detectAssistanceGaps(pastRequests, pastDistributions);

    res.json({
      household,
      isVerified: household.verificationStatus === 'verified',
      priorityLevel: household.priorityLevel,
      priorityScore: household.priorityScore,
      recommendations,
      pastDistributions,
      gapAnalysis,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving QR scan data', error: error.message });
  }
});

// @route   GET /api/households
// @desc    Get all households (with optional filters)
router.get('/', protect, requireRole('barangay_official', 'lgu_admin'), requireBarangayScope, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode) {
      query.barangayCode = req.query.barangayCode;
    }

    if (req.query.verificationStatus) {
      query.verificationStatus = req.query.verificationStatus;
    }

    if (req.query.priorityLevel) {
      query.priorityLevel = req.query.priorityLevel;
    }

    const households = await Household.find(query)
      .populate('headOfHouseholdUserId', 'name emailOrPhone')
      .sort({ priorityScore: -1 });

    res.json({
      count: households.length,
      households,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching households', error: error.message });
  }
});

module.exports = router;
