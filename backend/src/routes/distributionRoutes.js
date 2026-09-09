const express = require('express');
const router = express.Router();
const DistributionEvent = require('../models/DistributionEvent');
const Distribution = require('../models/Distribution');
const Household = require('../models/Household');
const RecoveryStatus = require('../models/RecoveryStatus');
const AuditLog = require('../models/AuditLog');
const ReliefItemType = require('../models/ReliefItemType');
const PolicyConfig = require('../models/PolicyConfig');
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
    } else if (req.user.role === 'field_staff') {
      // Field staff see all active drives or drives in their assigned barangay
      if (req.user.barangayCode) {
        query.$or = [{ barangayCode: req.user.barangayCode }, { isActive: true }];
      }
    }
    // Admins/superadmins see all events (active + closed)
    const events = await DistributionEvent.find(query).populate('openedBy', 'name emailOrPhone').sort({ openedAt: -1, createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching distribution events', error: error.message });
  }
});

// @route   PATCH /api/distributions/events/:id
// @desc    Update distribution event status
router.patch('/events/:id', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
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
            action: 'dispatch',
            quantity: qtyToDeduct,
            purpose: `Relief Distribution: ${event.title}`,
            destination: `Barangay ${event.barangayCode || '291'}`,
            notes: `Auto-Dispatched for Event: ${event.title} (Brgy ${event.barangayCode})`,
            performedBy: req.user._id,
            performedByName: req.user.name || 'System Admin',
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
router.post('/release', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    let { distributionEventId, householdId, overrideBaseUnits, overrideTopUpUnits, overrideReason } = req.body;

    if (!householdId) {
      return res.status(400).json({ message: 'Please provide householdId.' });
    }

    const mongoose = require('mongoose');
    let household = null;
    if (mongoose.Types.ObjectId.isValid(householdId)) {
      household = await Household.findById(householdId);
    }
    if (!household) {
      household = await Household.findOne({
        $or: [
          { qrCode: householdId },
          { 'previousQrCodes.code': householdId },
        ],
      });
    }
    if (!household) {
      return res.status(404).json({ message: 'Household not found.' });
    }

    let event = null;
    if (distributionEventId && mongoose.Types.ObjectId.isValid(distributionEventId)) {
      event = await DistributionEvent.findById(distributionEventId);
    }
    if (!event) {
      if (household.barangayCode) {
        event = await DistributionEvent.findOne({ isActive: true, barangayCode: household.barangayCode });
      }
      if (!event) {
        event = await DistributionEvent.findOne({ isActive: true });
      }
      if (!event) {
        event = await DistributionEvent.findOne({ status: 'Scheduled', ...(household.barangayCode ? { barangayCode: household.barangayCode } : {}) });
        if (event) {
          event.isActive = true;
          event.status = 'Ongoing';
          await event.save();
        }
      }
      if (!event) {
        event = await DistributionEvent.create({
          title: 'Relief Distribution — ' + (household.barangayCode || '291'),
          itemType: 'Family Food Pack',
          batchId: 'BATCH-AUTO-' + Date.now(),
          barangayCode: household.barangayCode || '291',
          location: 'Barangay Covered Court',
          openedBy: req.user._id,
          isActive: true,
          status: 'Ongoing',
        });
      }
    }
    distributionEventId = event._id;

    // ✅ BARANGAY-EVENT GATING: Reject if household's barangay does NOT match the event's barangay.
    if (event.barangayCode && household.barangayCode) {
      const hhBrgy = String(household.barangayCode).trim();
      const evBrgy = String(event.barangayCode).trim();
      if (hhBrgy !== evBrgy) {
        // Log the cross-barangay attempt
        await AuditLog.create({
          actorUserId: req.user._id,
          actorRole: req.user.role,
          action: 'CROSS_BARANGAY_CLAIM_BLOCKED',
          targetType: 'Household',
          targetId: household._id.toString(),
          notes: `BLOCKED: Cross-barangay claim attempt. Household is from Barangay ${hhBrgy} but event "${event.title}" is for Barangay ${evBrgy}. Attempted by staff ${req.user.name || req.user.emailOrPhone}.`,
        });

        // Emit real-time alert to admin dashboard
        const io = req.app.get('io');
        if (io) {
          io.to('admin_room').emit('duplicate_claim_alert', {
            id: Date.now(),
            _id: Date.now(),
            name: household.headOfHouseholdUserId?.name || `Beneficiary (${household.address})`,
            householdAddress: household.address,
            barangay: hhBrgy,
            barangayCode: hhBrgy,
            qr: household.qrCode,
            reason: `BLOCKED: Cross-barangay claim — Household from Brgy ${hhBrgy} tried to claim from Brgy ${evBrgy} event "${event.title}"`,
            severity: 'High',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            itemType: event.itemType,
            attemptedByStaff: req.user.name || req.user.emailOrPhone,
            attemptedAt: new Date(),
          });
        }

        return res.status(403).json({
          barangayMismatch: true,
          message: `Hindi pwede. Ang pamilyang ito ay mula sa Barangay ${hhBrgy}, ngunit ang distribution event na ito ay para sa Barangay ${evBrgy} lamang. Tanging ang mga residente ng Barangay ${evBrgy} ang maaaring makatanggap dito.`,
          householdBarangay: hhBrgy,
          eventBarangay: evBrgy,
        });
      }
    }

    if (household.verificationStatus !== 'verified') {
      return res.status(400).json({ message: 'Cannot release relief to unverified household.' });
    }

    // Consolidate all related households sharing headOfHouseholdUserId
    let relatedHhIds = [household._id];
    if (household.headOfHouseholdUserId) {
      const headId = household.headOfHouseholdUserId._id || household.headOfHouseholdUserId;
      const related = await Household.find({ headOfHouseholdUserId: headId }).select('_id');
      relatedHhIds = related.map(h => h._id);
    }

    // 1. REAL-TIME ANTI-DUPLICATE CHECK
    const existingClaim = await Distribution.findOne({
      distributionEventId,
      householdId: { $in: relatedHhIds },
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
          id: Date.now(),
          _id: Date.now(),
          name: household.headOfHouseholdUserId?.name || `Beneficiary (${household.address})`,
          householdAddress: household.address,
          householdPurok: household.purok,
          barangay: household.barangayCode || '291',
          barangayCode: household.barangayCode,
          qr: household.qrCode || `HH-${household.barangayCode}-${household._id.toString().slice(-6).toUpperCase()}`,
          reason: `BLOCKED: Duplicate claim attempt for ${event.itemType} (Already claimed at ${existingClaim.releasedAt ? new Date(existingClaim.releasedAt).toLocaleTimeString() : 'earlier'})`,
          severity: 'High',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    const policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    const baseCoverage = (policy && policy.baseCoverage) ? policy.baseCoverage : (itemConfig ? itemConfig.baseCoverage : 5);
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
      householdId: household._id,
      itemType: event.itemType,
      baseUnitsGiven,
      topUpUnitsGiven,
      householdSizeAtDistribution: household.memberCount,
      releasedBy: req.user._id,
      overrideReason: isOverridden ? overrideReason : null,
    });

    // 4. UPDATE RECOVERY STATUS TO 'assistance_received' or 'ongoing'
    const targetHhIds = Array.from(new Set([household._id, ...(relatedHhIds || [])]));
    let primaryRecoveryStatus = 'assistance_received';

    for (const hId of targetHhIds) {
      let rec = await RecoveryStatus.findOne({ householdId: hId });
      if (!rec) {
        rec = new RecoveryStatus({ householdId: hId });
      }
      if (rec.status === 'waiting') {
        rec.status = 'assistance_received';
      } else if (rec.status === 'assistance_received') {
        rec.status = 'ongoing';
      }
      rec.updatedBy = req.user._id;
      rec.updatedAt = new Date();
      await rec.save();
      if (String(hId) === String(household._id)) {
        primaryRecoveryStatus = rec.status;
      }
    }

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

    // Notify resident and web-admin real-time via Socket.IO
    const io = req.app.get('io');
    if (io) {
      for (const hId of targetHhIds) {
        io.to(`household:${hId}`).emit('assistance_released', {
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
        io.to(`household:${hId}`).emit('recovery_status_updated', primaryRecoveryStatus);
      }

      // Global socket broadcasts for Web Admin (Recovery Tracker, Distribution Claims Roster, Dashboard)
      io.emit('recovery_updated', {
        householdId: String(household._id),
        relatedHouseholdIds: targetHhIds.map(id => String(id)),
        status: primaryRecoveryStatus,
        headName: household.headOfHouseholdUserId?.name || 'Resident',
        barangayCode: household.barangayCode,
        releasedAt: releaseRecord.releasedAt,
        receiptNumber,
      });

      io.emit('assistance_released_global', {
        receiptNumber,
        distributionId: String(releaseRecord._id),
        householdId: String(household._id),
        relatedHouseholdIds: targetHhIds.map(id => String(id)),
        headName: household.headOfHouseholdUserId?.name || 'Resident',
        householdAddress: household.address,
        barangayCode: household.barangayCode,
        eventTitle: event.title,
        itemType: event.itemType,
        totalPacks: baseUnitsGiven + topUpUnitsGiven,
        releasedByName: req.user.name,
        releasedAt: releaseRecord.releasedAt,
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
      recoveryStatus: primaryRecoveryStatus,
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

// @route   GET /api/distributions/my-releases
// @desc    Get all distributions released by the currently logged in staff member
router.get('/my-releases', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const query = { releasedBy: req.user._id };
    const distributions = await Distribution.find(query)
      .populate('householdId', 'headOfHouseholdUserId address purok barangayCode memberCount qrCode')
      .populate({
        path: 'householdId',
        populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' }
      })
      .populate('distributionEventId', 'title itemType location')
      .sort({ releasedAt: -1 })
      .limit(50)
      .lean();

    res.json(distributions.map(d => ({
      id: d._id,
      _id: d._id,
      receiptNumber: `RCPT-${new Date(d.releasedAt || d.createdAt).getFullYear()}-${d._id.toString().slice(-6).toUpperCase()}`,
      householdName: d.householdId?.headOfHouseholdUserId?.name || 'Verified Beneficiary',
      householdAddress: d.householdId?.address || 'Manila City',
      barangayCode: d.householdId?.barangayCode || d.barangayCode || '291',
      qrCode: d.qrCode || d.householdId?.qrCode,
      eventTitle: d.distributionEventId?.title || 'Relief Distribution',
      itemType: d.distributionEventId?.itemType || 'Family Food Pack',
      baseUnitsGiven: d.baseUnitsGiven || 1,
      topUpUnitsGiven: d.topUpUnitsGiven || 0,
      totalPacks: (d.baseUnitsGiven || 1) + (d.topUpUnitsGiven || 0),
      releasedAt: d.releasedAt || d.createdAt,
      releasedByName: req.user.name,
      disbursingTeam: req.user.teamName || 'MDRRMO Field Operations',
      status: 'claimed',
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff releases', error: error.message });
  }
});

// @route   GET /api/distributions/all-claims
// @desc    Get live distribution roster of all claims across events for web admin audit
router.get('/all-claims', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode && req.query.barangayCode !== 'all') {
      query.barangayCode = req.query.barangayCode;
    }
    if (req.query.eventId) {
      query.distributionEventId = req.query.eventId;
    }

    const claims = await Distribution.find(query)
      .populate('householdId', 'headOfHouseholdUserId address purok barangayCode memberCount qrCode')
      .populate({
        path: 'householdId',
        populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' }
      })
      .populate('distributionEventId', 'title itemType location')
      .populate('releasedBy', 'name role teamName')
      .sort({ releasedAt: -1 })
      .limit(100)
      .lean();

    res.json(claims.map(c => ({
      id: c._id,
      _id: c._id,
      receiptNumber: `RCPT-${new Date(c.releasedAt || c.createdAt).getFullYear()}-${c._id.toString().slice(-6).toUpperCase()}`,
      householdName: c.householdId?.headOfHouseholdUserId?.name || 'Verified Beneficiary',
      householdAddress: c.householdId?.address || 'Manila City',
      barangayCode: c.householdId?.barangayCode || c.barangayCode || '291',
      qrCode: c.qrCode || c.householdId?.qrCode,
      eventTitle: c.distributionEventId?.title || 'Relief Distribution',
      itemType: c.distributionEventId?.itemType || 'Family Food Pack',
      baseUnitsGiven: c.baseUnitsGiven || 1,
      topUpUnitsGiven: c.topUpUnitsGiven || 0,
      totalPacks: (c.baseUnitsGiven || 1) + (c.topUpUnitsGiven || 0),
      releasedAt: c.releasedAt || c.createdAt,
      releasedByName: c.releasedBy?.name || 'Field Officer',
      disbursingTeam: c.releasedBy?.teamName || 'MDRRMO Field Operations',
      status: 'claimed',
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching claims roster', error: error.message });
  }
});

module.exports = router;
