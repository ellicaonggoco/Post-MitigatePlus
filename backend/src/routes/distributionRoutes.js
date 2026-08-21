const express = require('express');
const router = express.Router();
const DistributionEvent = require('../models/DistributionEvent');
const Distribution = require('../models/Distribution');
const Household = require('../models/Household');
const RecoveryStatus = require('../models/RecoveryStatus');
const AuditLog = require('../models/AuditLog');
const ReliefItemType = require('../models/ReliefItemType');
const { protect, requireRole } = require('../middleware/auth');
const { calculateReliefAllocation } = require('../utils/reliefAllocation');

// @route   GET /api/distribution-events
// @desc    Get distribution events (admins see all, field staff see active only)
router.get('/events', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'barangay_official' || req.user.role === 'field_staff') {
      query.barangayCode = req.user.barangayCode;
      query.isActive = true;
    }
    // Admins/superadmins see all events (active + closed)
    const events = await DistributionEvent.find(query).sort({ openedAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching distribution events', error: error.message });
  }
});

// @route   PATCH /api/distributions/events/:id
// @desc    Update distribution event status
router.patch('/events/:id', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { status, isActive } = req.body;
    const event = await DistributionEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Distribution event not found.' });
    }

    if (status === 'Completed' || isActive === false) {
      event.isActive = false;
      event.closedAt = new Date();
    } else if (status === 'Ongoing' || isActive === true) {
      event.isActive = true;
      event.closedAt = null;
    }

    await event.save();

    // Audit log the status change
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_EVENT_STATUS',
      targetType: 'DistributionEvent',
      targetId: event._id.toString(),
      notes: `Event "${event.title}" status updated. isActive: ${event.isActive}`,
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error updating event status', error: error.message });
  }
});

// @route   POST /api/distribution-events
// @desc    Open a new distribution event
router.post('/events', protect, requireRole('barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { title, itemType, batchId, barangayCode, location } = req.body;
    if (!title && !location) {
      return res.status(400).json({ message: 'Please provide at least a title or location.' });
    }

    const event = await DistributionEvent.create({
      title: title || `Relief Distribution — ${location}`,
      itemType: itemType || 'Family Food Pack',
      batchId: batchId || `BATCH-${Date.now()}`,
      barangayCode: barangayCode || req.user.barangayCode || '291',
      location: location || title,
      openedBy: req.user._id,
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error creating distribution event', error: error.message });
  }
});

// @route   POST /api/distributions/release
// @desc    Anti-Duplicate-Claim Relief Release Endpoint
router.post('/release', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { distributionEventId, householdId, overrideBaseUnits, overrideTopUpUnits, overrideReason } = req.body;

    if (!distributionEventId || !householdId) {
      return res.status(400).json({ message: 'Please provide distributionEventId and householdId.' });
    }

    const event = await DistributionEvent.findById(distributionEventId);
    if (!event || !event.isActive) {
      return res.status(400).json({ message: 'Distribution event is closed or invalid.' });
    }

    const household = await Household.findById(householdId);
    if (!household) {
      return res.status(404).json({ message: 'Household not found.' });
    }

    if (household.verificationStatus !== 'verified') {
      return res.status(400).json({ message: 'Cannot release relief to unverified household.' });
    }

    // 1. REAL-TIME ANTI-DUPLICATE CHECK
    const existingClaim = await Distribution.findOne({
      distributionEventId,
      householdId,
    });

    if (existingClaim) {
      // LOG BLOCKED DUPLICATE ATTEMPT
      await AuditLog.create({
        actorUserId: req.user._id,
        actorRole: req.user.role,
        action: 'DUPLICATE_CLAIM_BLOCKED',
        targetType: 'Household',
        targetId: household._id.toString(),
        notes: `BLOCKED duplicate claim attempt for event '${event.title}' (Item: ${event.itemType}). Previously claimed at ${existingClaim.releasedAt}`,
      });

      // Emit Socket.IO alert to Admin dashboard
      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('duplicate_claim_alert', {
          householdAddress: household.address,
          householdPurok: household.purok,
          barangayCode: household.barangayCode,
          itemType: event.itemType,
          attemptedByStaff: req.user.name,
          attemptedAt: new Date(),
        });
      }

      return res.status(409).json({
        isDuplicate: true,
        message: 'DUPLICATE CLAIM BLOCKED: Household has already claimed relief under this distribution event.',
        claimedAt: existingClaim.releasedAt,
        claimedByHouseholdSize: existingClaim.householdSizeAtDistribution,
      });
    }

    // 2. COMPUTE RIGHT-SIZED RELIEF ALLOCATION
    const itemConfig = await ReliefItemType.findOne({ name: event.itemType });
    const baseCoverage = itemConfig ? itemConfig.baseCoverage : 5;
    const category = itemConfig ? itemConfig.category : 'headcount_scaled';

    const calculated = calculateReliefAllocation(household.memberCount, baseCoverage, category);

    const baseUnitsGiven = overrideBaseUnits !== undefined ? parseInt(overrideBaseUnits) : calculated.basePacks;
    const topUpUnitsGiven = overrideTopUpUnits !== undefined ? parseInt(overrideTopUpUnits) : calculated.topUpUnits;

    // Check if staff overridden standard calculation
    const isOverridden = (baseUnitsGiven !== calculated.basePacks) || (topUpUnitsGiven !== calculated.topUpUnits);
    if (isOverridden && (!overrideReason || overrideReason.trim() === '')) {
      return res.status(400).json({
        message: 'Reason is required when overriding recommended relief quantities.',
      });
    }

    // 3. RECORD DISTRIBUTION RELEASE
    const releaseRecord = await Distribution.create({
      distributionEventId,
      householdId,
      itemType: event.itemType,
      baseUnitsGiven,
      topUpUnitsGiven,
      householdSizeAtDistribution: household.memberCount,
      releasedBy: req.user._id,
      overrideReason: isOverridden ? overrideReason : null,
    });

    // 4. UPDATE RECOVERY STATUS TO 'assistance_received' or 'ongoing'
    let recovery = await RecoveryStatus.findOne({ householdId: household._id });
    if (!recovery) {
      recovery = new RecoveryStatus({ householdId: household._id });
    }
    if (recovery.status === 'waiting') {
      recovery.status = 'assistance_received';
    } else if (recovery.status === 'assistance_received') {
      recovery.status = 'ongoing';
    }
    recovery.updatedBy = req.user._id;
    recovery.updatedAt = new Date();
    await recovery.save();

    // 5. AUDIT LOG RELEASE
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'RELEASE_RELIEF',
      targetType: 'Distribution',
      targetId: releaseRecord._id.toString(),
      notes: `Released ${baseUnitsGiven} base + ${topUpUnitsGiven} top-up '${event.itemType}' to ${household.address} (${household.memberCount} members). ${isOverridden ? `[OVERRIDDEN: ${overrideReason}]` : '[RECOMMENDED]'}`
    });

    // Notify resident via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${household._id}`).emit('assistance_released', {
        itemType: event.itemType,
        baseUnitsGiven,
        topUpUnitsGiven,
        releasedAt: releaseRecord.releasedAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Relief successfully issued and recorded.',
      distribution: releaseRecord,
      recoveryStatus: recovery.status,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        isDuplicate: true,
        message: 'DUPLICATE CLAIM BLOCKED: Claim already logged for this event.',
      });
    }
    res.status(500).json({ message: 'Error processing relief release', error: error.message });
  }
});

module.exports = router;
