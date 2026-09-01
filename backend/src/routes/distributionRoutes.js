const express = require('express');
const router = express.Router();
const DistributionEvent = require('../models/DistributionEvent');
const Distribution = require('../models/Distribution');
const Household = require('../models/Household');
const RecoveryStatus = require('../models/RecoveryStatus');
const AuditLog = require('../models/AuditLog');
const ReliefItemType = require('../models/ReliefItemType');
const WarehouseItem = require('../models/WarehouseItem');
const WarehouseLog = require('../models/WarehouseLog');
const { protect, requireRole } = require('../middleware/auth');
const { calculateReliefAllocation } = require('../utils/reliefAllocation');

// @route   GET /api/distribution-events
// @desc    Get distribution events (admins see all, barangay officials see their barangay, field staff see active drives)
router.get('/events', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
      query.isActive = true;
    } else if (req.user.role === 'field_staff') {
      // Field staff see all active drives city-wide (or drives assigned to their team)
      query.isActive = true;
    }
    // Admins/superadmins see all events (active + closed)
    const events = await DistributionEvent.find(query).populate('openedBy', 'name emailOrPhone').sort({ openedAt: -1 });
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

    // Log status update
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

// @route   PATCH /api/distributions/events/:id/announcement
// @desc    Edit distribution announcement and broadcast updated alert to mobile apps
router.patch('/events/:id/announcement', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { announcementMessage } = req.body;
    const event = await DistributionEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Distribution event not found.' });
    }

    event.announcementMessage = announcementMessage;
    await event.save();

    const Announcement = require('../models/Announcement');
    const cleanCode = event.barangayCode || '291';

    // Find and update existing announcement or create an updated announcement record
    let ann = await Announcement.findOne({
      barangayCode: cleanCode,
      category: 'Relief Distribution',
    }).sort({ postedAt: -1 });

    if (ann) {
      ann.title = `📢 Relief Distribution Advisory: Barangay ${cleanCode} (Na-update)`;
      ann.body = announcementMessage;
      ann.tag = 'UPDATED';
      ann.edited = true;
      ann.editedAt = new Date();
      await ann.save();
    } else {
      ann = await Announcement.create({
        title: `📢 Relief Distribution Advisory: Barangay ${cleanCode} (Na-update)`,
        body: announcementMessage,
        barangayCode: cleanCode,
        category: 'Relief Distribution',
        scope: 'barangay',
        tag: 'UPDATED',
        edited: true,
        editedAt: new Date(),
        targetTab: 'distribution',
        postedBy: req.user._id,
      });
    }

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_updated', ann);
      io.to(`brgy:${cleanCode}`).emit('announcement_updated', ann);
      io.emit('new_announcement', ann);
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_EVENT_ANNOUNCEMENT',
      targetType: 'DistributionEvent',
      targetId: event._id.toString(),
      notes: `Announcement for event "${event.title}" updated and broadcasted to Barangay ${cleanCode}`,
    });

    res.json({ success: true, event, announcement: ann });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event announcement', error: error.message });
  }
});

// @route   POST /api/distribution-events
// @desc    Schedule a new distribution event and broadcast announcement
router.post('/events', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const {
      title,
      itemType,
      batchId,
      barangayCode,
      location,
      assignedTeam,
      staffAssigned,
      scheduledDate,
      scheduledTime,
      targetHouseholds,
      announcementMessage,
    } = req.body;

    if (!title && !location && !barangayCode) {
      return res.status(400).json({ message: 'Please provide at least a title or location.' });
    }

    const cleanCode = (barangayCode || '').replace(/\D/g, '') || req.user.barangayCode || '291';
    const targetHH = parseInt(targetHouseholds) || 0;

    const event = await DistributionEvent.create({
      title: title || `Relief Distribution - Barangay ${cleanCode}`,
      itemType: itemType || 'Family Food Pack',
      batchId: batchId || `BATCH-${Date.now()}`,
      barangayCode: cleanCode,
      location: location || `Barangay ${cleanCode} Covered Court`,
      assignedTeam: assignedTeam || staffAssigned || 'Field Team Alpha',
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      targetHouseholds: targetHH,
      announcementMessage: announcementMessage || '',
      status: 'Scheduled',
      isActive: false,
      openedBy: req.user._id,
    });

    // ── AWTOMATIKONG ANNOUNCEMENT BROADCAST SA RESIDENTS AT BARANGAY OFFICIALS ──
    const finalAnnouncementText = (announcementMessage && announcementMessage.trim()) ||
      `Magandang araw po sa mga taga-Barangay ${cleanCode}! May nakatakdang pamamahagi ng ${itemType || 'Family Food Pack'} sa darating na ${scheduledDate || 'nakatakdang petsa'} sa ganap na ${scheduledTime || '08:00 AM'}. Mangyaring ihanda ang inyong Digital QR Relief Pass para sa mabilisang claim sa relief distribution center.`;

    try {
      const Announcement = require('../models/Announcement');
      const ann = await Announcement.create({
        title: `📢 Relief Distribution Advisory: Barangay ${cleanCode}`,
        body: finalAnnouncementText,
        barangayCode: cleanCode,
        category: 'Relief Distribution',
        scope: 'barangay',
        tag: 'DISTRIBUTION',
        targetTab: 'distribution',
        postedBy: req.user._id,
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('new_announcement', ann);
        io.to(`brgy:${cleanCode}`).emit('new_announcement', ann);
      }
    } catch (annErr) {
      console.error('Error broadcasting announcement for distribution event:', annErr);
    }

    // ── AWTOMATIKONG DEDUCTION / DISPATCH MULA SA WAREHOUSE STOCK ──
    if (targetHH > 0) {
      try {
        const itemTypeQuery = (itemType || 'Family Food Pack').toLowerCase();
        let matchedItem = await WarehouseItem.findOne({
          name: { $regex: new RegExp(itemTypeQuery.split(' ')[0], 'i') }
        });
        if (!matchedItem) {
          matchedItem = await WarehouseItem.findOne();
        }

        if (matchedItem) {
          const qtyToDeduct = Math.min(matchedItem.stock, targetHH);
          matchedItem.stock = Math.max(0, matchedItem.stock - qtyToDeduct);
          matchedItem.updatedBy = req.user._id;
          await matchedItem.save();

          await WarehouseLog.create({
            itemId: matchedItem._id,
            itemName: matchedItem.name,
            type: 'dispatch',
            quantity: qtyToDeduct,
            notes: `Auto-Dispatched for Event: ${event.title} (Brgy ${event.barangayCode})`,
            performedBy: req.user.name || 'System Admin',
            recordedBy: req.user._id,
          });

          await AuditLog.create({
            actorUserId: req.user._id,
            actorRole: req.user.role,
            action: 'WAREHOUSE_AUTO_DISPATCH',
            targetType: 'WarehouseItem',
            targetId: matchedItem._id.toString(),
            notes: `Auto-dispatched ${qtyToDeduct} ${matchedItem.unit} for Event: ${event.title}`,
          });
        }
      } catch (stockErr) {
        console.error('Warehouse auto-dispatch error:', stockErr);
      }
    }

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

    // 6. GENERATE DIGITAL CLAIM RECEIPT
    const receiptNumber = `RCPT-${new Date().getFullYear()}-${releaseRecord._id.toString().slice(-6).toUpperCase()}`;

    // Notify resident via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${household._id}`).emit('assistance_released', {
        receiptNumber,
        eventTitle: event.title,
        itemType: event.itemType,
        baseUnitsGiven,
        topUpUnitsGiven,
        totalPacks: baseUnitsGiven + topUpUnitsGiven,
        releasedAt: releaseRecord.releasedAt,
        releasedByName: req.user.name,
        disbursingTeam: req.user.teamName || 'MDRRMO Field Operations',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Relief successfully issued and recorded.',
      distribution: releaseRecord,
      receiptNumber,
      receipt: {
        receiptNumber,
        eventTitle: event.title,
        barangayCode: household.barangayCode,
        householdAddress: household.address,
        headOfHousehold: household.headOfHouseholdUserId?.name || 'Verified Beneficiary',
        itemType: event.itemType,
        totalPacks: baseUnitsGiven + topUpUnitsGiven,
        baseUnitsGiven,
        topUpUnitsGiven,
        releasedAt: releaseRecord.releasedAt,
        releasedByName: req.user.name,
        disbursingTeam: req.user.teamName || 'MDRRMO Field Operations',
      },
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

// @route   POST /api/distributions/sync-offline-claims
// @desc    Batch sync offline claims stored locally on Field Staff mobile device
router.post('/sync-offline-claims', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { claims } = req.body;
    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({ message: 'No offline claims to sync.' });
    }

    let syncedCount = 0;
    let duplicateCount = 0;
    let errors = [];

    for (const claim of claims) {
      const { distributionEventId, householdId, qrCode, baseUnitsGiven, topUpUnitsGiven, releasedAt } = claim;
      
      let targetHouseholdId = householdId;
      if (!targetHouseholdId && qrCode) {
        const hh = await Household.findOne({ qrCode: qrCode.trim() });
        if (hh) targetHouseholdId = hh._id;
      }

      if (!targetHouseholdId || !distributionEventId) {
        errors.push({ claim, reason: 'Missing householdId or eventId' });
        continue;
      }

      // Check existing claim in DB
      const existing = await Distribution.findOne({ distributionEventId, householdId: targetHouseholdId });
      if (existing) {
        duplicateCount++;
        continue;
      }

      const event = await DistributionEvent.findById(distributionEventId);
      const itemType = event ? event.itemType : 'Family Food Pack';
      const hhDoc = await Household.findById(targetHouseholdId);

      try {
        await Distribution.create({
          distributionEventId,
          householdId: targetHouseholdId,
          itemType,
          baseUnitsGiven: baseUnitsGiven || 1,
          topUpUnitsGiven: topUpUnitsGiven || 0,
          householdSizeAtDistribution: hhDoc?.memberCount || 1,
          releasedBy: req.user._id,
          releasedAt: releasedAt ? new Date(releasedAt) : new Date(),
        });

        await AuditLog.create({
          actorUserId: req.user._id,
          actorRole: req.user.role,
          action: 'OFFLINE_CLAIM_SYNCED',
          targetType: 'Distribution',
          targetId: targetHouseholdId.toString(),
          notes: `Offline claim synced for event '${event?.title || distributionEventId}'. Released by ${req.user.name}.`,
        });

        syncedCount++;
      } catch (err) {
        if (err.code === 11000) {
          duplicateCount++;
        } else {
          errors.push({ claim, error: err.message });
        }
      }
    }

    res.json({
      success: true,
      message: `Batch sync complete: ${syncedCount} claims uploaded, ${duplicateCount} duplicates ignored.`,
      syncedCount,
      duplicateCount,
      errorsCount: errors.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing offline claims', error: error.message });
  }
});

module.exports = router;
