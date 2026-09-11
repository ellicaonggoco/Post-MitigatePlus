const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Household = require('../models/Household');
const Distribution = require('../models/Distribution');
const DistributionEvent = require('../models/DistributionEvent');
const AssistanceRequest = require('../models/AssistanceRequest');
const AuditLog = require('../models/AuditLog');
const RecoveryStatus = require('../models/RecoveryStatus');
const DamageReport = require('../models/DamageReport');
const { protect, requireRole, requireBarangayScope } = require('../middleware/auth');
const { calculatePriorityIndex } = require('../utils/priorityIndex');
const { calculateReliefAllocation, calculateHouseholdEntitlement } = require('../utils/reliefAllocation');
const { detectAssistanceGaps } = require('../utils/gapDetection');
const { isStaffTeamMatch } = require('../utils/teamHelper');
const QRCode = require('qrcode');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const jsQR = require('jsqr');
const https = require('https');

/**
 * High-speed image buffer decoder for QR codes
 * Supports PNG and JPEG camera snapshots, with auto-centering crop for high-res photos.
 */
async function decodeImageBuffer(buffer) {
  // 1. Try PNG via pngjs
  try {
    const png = PNG.sync.read(buffer);
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) {
      return { success: true, qrCode: code.data, format: 'png' };
    }
  } catch (err) {
    // Not a valid PNG, proceed to JPEG
  }

  // 2. Try JPEG via jpeg-js
  try {
    const jpg = jpeg.decode(buffer, { useTArray: true });
    if (jpg && jpg.data && jpg.width && jpg.height) {
      const code = jsQR(new Uint8ClampedArray(jpg.data), jpg.width, jpg.height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data) {
        return { success: true, qrCode: code.data, format: 'jpeg' };
      }

      // If high-resolution photo, attempt center crop (center 70% where QR pass is framed)
      if (jpg.width > 500 && jpg.height > 500) {
        const cropW = Math.floor(jpg.width * 0.75);
        const cropH = Math.floor(jpg.height * 0.75);
        const startX = Math.floor((jpg.width - cropW) / 2);
        const startY = Math.floor((jpg.height - cropH) / 2);
        const croppedData = new Uint8ClampedArray(cropW * cropH * 4);
        for (let y = 0; y < cropH; y++) {
          for (let x = 0; x < cropW; x++) {
            const srcIdx = ((y + startY) * jpg.width + (x + startX)) * 4;
            const dstIdx = (y * cropW + x) * 4;
            croppedData[dstIdx] = jpg.data[srcIdx];
            croppedData[dstIdx + 1] = jpg.data[srcIdx + 1];
            croppedData[dstIdx + 2] = jpg.data[srcIdx + 2];
            croppedData[dstIdx + 3] = jpg.data[srcIdx + 3];
          }
        }
        const cropCode = jsQR(croppedData, cropW, cropH, { inversionAttempts: 'attemptBoth' });
        if (cropCode && cropCode.data) {
          return { success: true, qrCode: cropCode.data, format: 'jpeg-crop' };
        }
      }
    }
  } catch (err) {
    // Not a valid JPEG
  }

  return { success: false };
}

/**
 * Secondary fallback to public cloud QR decoding API
 */
function decodeViaQrServer(buffer) {
  return new Promise((resolve) => {
    try {
      const boundary = '----MitigatePlusBoundary' + Date.now();
      const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="qr.png"\r\nContent-Type: image/png\r\n\r\n`);
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, buffer, tail]);

      const req = https.request({
        hostname: 'api.qrserver.com',
        path: '/v1/read-qr-code/',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 6000,
      }, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            const foundData = parsed?.[0]?.symbol?.[0]?.data;
            if (foundData) {
              return resolve({ success: true, qrCode: foundData });
            }
          } catch (e) {}
          resolve({ success: false });
        });
      });

      req.on('error', () => resolve({ success: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false });
      });
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ success: false });
    }
  });
}

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
    const prevPriority = household.priorityLevel;
    household.priorityScore = priorityScore;
    household.priorityLevel = priorityLevel;

    // Send in-app notification to household
    if (!household.inAppNotifications) household.inAppNotifications = [];
    
    if (status === 'verified') {
      household.inAppNotifications.unshift({
        id: Date.now().toString(),
        title: '✅ Rehistrasyon Naaprubahan!',
        message: `Na-verify na ng Barangay Official ang inyong pamilya. Ang inyong Priority Level ay ${priorityLevel}. Ang inyong Official QR Pass ay handa na para sa distribusyon ng ayuda.`,
        type: 'verification',
        createdAt: new Date(),
        isRead: false,
      });
    } else if (status === 'rejected') {
      household.inAppNotifications.unshift({
        id: Date.now().toString(),
        title: '❌ Rehistrasyon Hindi Naaprubahan',
        message: `Hindi naaprubahan ang inyong rehistrasyon. Dahilan: ${verificationNotes || 'Kulang sa patunay o dokumento'}. Mangyaring makipag-ugnayan sa Barangay Hall.`,
        type: 'verification',
        createdAt: new Date(),
        isRead: false,
      });
    } else if (prevPriority !== priorityLevel) {
      household.inAppNotifications.unshift({
        id: Date.now().toString(),
        title: '🔔 Na-update ang Priority Level',
        message: `Ang inyong Priority Level ay na-update sa [${priorityLevel}] batay sa inyong na-verify na datos at assessment.`,
        type: 'priority_update',
        createdAt: new Date(),
        isRead: false,
      });
    }

    await household.save();

    // Log audit
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: `VERIFICATION_${status.toUpperCase()}`,
      targetType: 'Household',
      targetId: household._id.toString(),
      notes: `Verified status updated to ${status}. Priority: ${priorityLevel}. Members: ${household.memberCount}. Notes: ${verificationNotes || 'None'}`,
    });

    // Notify resident via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${household._id}`).emit('verification_updated', {
        verificationStatus: status,
        verificationNotes,
        priorityLevel: household.priorityLevel,
        priorityScore: household.priorityScore,
        memberCount: household.memberCount,
        verifiedAt: household.verifiedAt,
      });
      io.to(`household:${household._id}`).emit('new_in_app_notification', {
        title: status === 'verified' ? '✅ Rehistrasyon Naaprubahan' : '🔔 Notipikasyon sa Account',
        priorityLevel: household.priorityLevel,
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

    const PolicyConfig = require('../models/PolicyConfig');
    const policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    const entitlement = calculateHouseholdEntitlement(household, policy);
    const gapAnalysis = detectAssistanceGaps(pastRequests, pastDistributions);

    const recovery = await RecoveryStatus.findOne({ householdId: household._id });
    const householdObj = household.toObject();
    householdObj.recoveryStatus = recovery ? recovery.status : 'waiting';

    // Check for active distribution event in this household's barangay (strictly ongoing)
    const activeEvent = await DistributionEvent.findOne({
      barangayCode: household.barangayCode || '291',
      $or: [
        { isActive: true },
        { status: 'Ongoing' },
      ],
    }).sort({ isActive: -1, openedAt: -1, createdAt: -1 });

    // Check if this household has claimed in the currently active event
    let isClaimedInActiveEvent = false;
    let activeClaimDetails = null;
    if (activeEvent) {
      const claim = await Distribution.findOne({
        distributionEventId: activeEvent._id,
        householdId: household._id,
      });
      if (claim) {
        isClaimedInActiveEvent = true;
        activeClaimDetails = claim;
      }
    }

    const latestDamageReport = await DamageReport.findOne({ householdId: household._id }).sort({ reportedAt: -1 });
    householdObj.latestDamageReport = latestDamageReport || null;
    householdObj.damageReportStatus = latestDamageReport ? latestDamageReport.verificationStatus : 'none';

    householdObj.hasActiveEvent = !!activeEvent;
    householdObj.activeEvent = activeEvent || null;
    householdObj.isClaimedInActiveEvent = isClaimedInActiveEvent;
    householdObj.activeClaimDetails = activeClaimDetails;
    householdObj.hasPastClaims = hasPastClaims;

    res.json({
      household: householdObj,
      entitlement,
      gapAnalysis,
      pastRequests,
      pastDistributions,
      activeEvent: activeEvent || null,
      isClaimedInActiveEvent,
      activeClaimDetails,
      hasPastClaims,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching household details', error: error.message });
  }
});

// @route   GET /api/households/qr/:code
// @desc    Field Staff QR scan lookup endpoint
router.get('/qr/:code', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const rawCode = (req.params.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ message: 'QR code parameter is required.' });
    }

    const User = require('../models/User');
    const escaped = rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let household = await Household.findOne({
      $or: [
        { qrCode: rawCode },
        { qrCode: new RegExp('^' + escaped + '$', 'i') },
        { 'previousQrCodes.code': rawCode },
        { 'previousQrCodes.code': new RegExp('^' + escaped + '$', 'i') },
      ],
    }).populate('headOfHouseholdUserId', 'name emailOrPhone');

    if (!household && mongoose.Types.ObjectId.isValid(rawCode)) {
      household = await Household.findById(rawCode).populate('headOfHouseholdUserId', 'name emailOrPhone');
    }

    // Also allow finding by resident phone or email if staff types resident's contact
    if (!household) {
      const residentUser = await User.findOne({ emailOrPhone: rawCode });
      if (residentUser) {
        household = await Household.findOne({ headOfHouseholdUserId: residentUser._id }).populate('headOfHouseholdUserId', 'name emailOrPhone');
      }
    }

    // Fallback: Check AuditLog for historically revoked QR codes
    if (!household) {
      const auditMatch = await AuditLog.findOne({
        action: 'QR_REVOKED_AND_REGENERATED',
        notes: new RegExp(escaped, 'i'),
      }).sort({ createdAt: -1 });

      if (auditMatch && auditMatch.targetId && mongoose.Types.ObjectId.isValid(auditMatch.targetId)) {
        household = await Household.findById(auditMatch.targetId).populate('headOfHouseholdUserId', 'name emailOrPhone');
      }
    }

    if (!household) {
      return res.status(404).json({ message: `Household QR Code "${rawCode}" not found or invalid.` });
    }

    // Identify if the scanned code is an obsolete/revoked QR code
    let isRevokedQr = false;
    let revokedDetails = null;
    if (household.qrCode && household.qrCode.toLowerCase() !== rawCode.toLowerCase()) {
      isRevokedQr = true;
      if (Array.isArray(household.previousQrCodes)) {
        revokedDetails = household.previousQrCodes.find(p => p.code && p.code.toLowerCase() === rawCode.toLowerCase());
      }
    }

    // Consolidate all related households sharing the same headOfHouseholdUserId
    let relatedHhIds = [household._id];
    if (household.headOfHouseholdUserId) {
      const headId = household.headOfHouseholdUserId._id || household.headOfHouseholdUserId;
      const related = await Household.find({ headOfHouseholdUserId: headId }).select('_id qrCode previousQrCodes');
      relatedHhIds = related.map(h => h._id);

      for (const rel of related) {
        if (Array.isArray(rel.previousQrCodes)) {
          const matchPrev = rel.previousQrCodes.find(p => p.code && p.code.toLowerCase() === rawCode.toLowerCase());
          if (matchPrev) {
            isRevokedQr = true;
            if (!revokedDetails) revokedDetails = matchPrev;
          }
        }
      }
    }

    // Resolve target event to check anti-duplicate claims
    let queryEvId = null;
    let eventName = 'Relief Distribution';
    let resolvedEvent = null;
    const explicitEventId = req.query.eventId && req.query.eventId !== 'undefined' && req.query.eventId !== 'null'
      ? req.query.eventId : null;

    if (explicitEventId && mongoose.Types.ObjectId.isValid(explicitEventId)) {
      queryEvId = explicitEventId;
      resolvedEvent = await DistributionEvent.findById(queryEvId);
      if (resolvedEvent) {
        eventName = resolvedEvent.title;
      }
    }

    // BARANGAY-EVENT GATING: If a specific event was passed by the scanner,
    // check if household's barangay matches event's barangay.
    if (resolvedEvent && resolvedEvent.barangayCode && household.barangayCode) {
      const hhBrgy = String(household.barangayCode).trim();
      const evBrgy = String(resolvedEvent.barangayCode).trim();
      const allowCross = req.query.allowCrossBarangay === 'true';
      if (hhBrgy !== evBrgy && !allowCross) {
        return res.status(403).json({
          barangayMismatch: true,
          message: `Babala: Ang QR Code na ito ay para sa Barangay ${hhBrgy}, ngunit ang kasalukuyang distribution event ay para sa Barangay ${evBrgy}.`,
          householdBarangay: hhBrgy,
          eventBarangay: evBrgy,
          eventTitle: resolvedEvent.title,
        });
      }
    }

    // TEAM-EVENT GATING: If scanning against an event, field staff must belong to the event's assigned team
    if (resolvedEvent && resolvedEvent.assignedTeam && req.user.role === 'field_staff') {
      const isTeamAllowed = isStaffTeamMatch(req.user.teamName, resolvedEvent.assignedTeam || resolvedEvent.staffAssigned, req.user.name);
      if (!isTeamAllowed) {
        return res.status(403).json({
          teamMismatch: true,
          message: `Babala: Ang relief distribution event na ito ("${resolvedEvent.title}") ay nakatalaga sa ${resolvedEvent.assignedTeam}. Ikaw ay kabilang sa ${req.user.teamName || 'ibang team'}. Bawal mag-scan ng QR code para sa event na nakatalaga sa ibang team.`,
          eventTeam: resolvedEvent.assignedTeam,
          staffTeam: req.user.teamName,
          eventTitle: resolvedEvent.title,
        });
      }
    }

    // SPECIAL RELIEF / DOOR-TO-DOOR GATING: Check if resident has an active special relief request assigned to another team/staff
    if (req.user.role === 'field_staff') {
      const activeSpecialReq = await AssistanceRequest.findOne({
        householdId: { $in: relatedHhIds },
        status: { $in: ['pending', 'approved', 'under_review', 'assigned'] },
      }).populate('assignedStaff', 'name teamName');

      if (activeSpecialReq && activeSpecialReq.assignedStaff) {
        const assignedStaffUser = activeSpecialReq.assignedStaff;
        const assignedTeamName = assignedStaffUser.teamName || activeSpecialReq.assignedStaffName || '';
        const isSpecialMatch = isStaffTeamMatch(req.user.teamName, assignedTeamName, req.user.name) ||
          (assignedStaffUser._id && assignedStaffUser._id.toString() === req.user._id.toString());
        if (!isSpecialMatch) {
          return res.status(403).json({
            teamMismatch: true,
            isSpecialReliefMismatch: true,
            message: `Babala: Ang espesyal na relief delivery para sa residenteng ito ay nakatalaga kay ${activeSpecialReq.assignedStaffName || assignedStaffUser.name} (${assignedTeamName || 'Ibang Team'}). Bawal itong i-scan ng ibang team (${req.user.teamName || 'Field Staff'}).`,
            assignedStaffName: activeSpecialReq.assignedStaffName || assignedStaffUser.name,
            assignedTeam: assignedTeamName,
            staffTeam: req.user.teamName,
          });
        }
      }
    }

    if (!queryEvId) {
      // Only ever resolve to an event for THIS household's own barangay (or an explicit
      // city-wide event with no barangayCode / barangayCode 'ALL'). Never borrow an
      // unrelated barangay's active event just because it happens to be the only one open —
      // that produced confusing "wrong barangay" rejections downstream instead of a clear
      // "no active event for your barangay" message.
      const barangayOrCityWide = household.barangayCode
        ? { $or: [{ barangayCode: household.barangayCode }, { barangayCode: 'ALL' }, { barangayCode: null }, { barangayCode: { $exists: false } }] }
        : {};

      let activeEv = await DistributionEvent.findOne({
        isActive: true,
        ...barangayOrCityWide,
      }).sort({ openedAt: -1, createdAt: -1 });

      if (activeEv) {
        queryEvId = activeEv._id;
        eventName = activeEv.title;
      } else {
        const recentEv = await DistributionEvent.findOne({
          status: { $in: ['Ongoing', 'Scheduled'] },
          ...barangayOrCityWide,
        }).sort({ createdAt: -1 });
        if (recentEv) {
          queryEvId = recentEv._id;
          eventName = recentEv.title;
        }
      }
    }

    // Check anti-duplicate claim across all related household records
    let claimQuery = { householdId: { $in: relatedHhIds } };
    if (queryEvId) {
      claimQuery.distributionEventId = queryEvId;
    }

    let existingClaim = await Distribution.findOne(claimQuery).sort({ releasedAt: -1 }).populate('distributionEventId');
    if (!existingClaim && !queryEvId) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      existingClaim = await Distribution.findOne({
        householdId: { $in: relatedHhIds },
        releasedAt: { $gte: yesterday },
      }).sort({ releasedAt: -1 }).populate('distributionEventId');
    }

    if (existingClaim) {
      const claimTime = new Date(existingClaim.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const evTitle = existingClaim.distributionEventId?.title || eventName;

      return res.json({
        duplicate: true,
        isDuplicate: true,
        isRevokedQr,
        message: isRevokedQr
          ? `DUPLICATE CLAIM & REVOKED QR: Ang pamilyang ito ay nakakuha na ng relief ayuda kaninang ${claimTime} (${evTitle}), at ang QR Code na iniscan ("${rawCode}") ay LUMANG QR na pinalitan na. Huwag nang bigyan muli.`
          : `DUPLICATE CLAIM BLOCKED: Ang pamilyang ito ay nakatanggap na ng relief ayuda kaninang ${claimTime} sa event na ito.`,
        claimedAt: existingClaim.releasedAt,
        distributionEvent: existingClaim.distributionEventId || { title: evTitle },
        household: {
          ...household.toObject(),
          name: household.headOfHouseholdUserId?.name || 'Beneficiary Head',
          familyHeadcount: household.memberCount || 1,
          activeQrCode: household.qrCode,
        },
        isVerified: household.verificationStatus === 'verified',
      });
    }

    // If QR is revoked and NO claim has been recorded yet today:
    if (isRevokedQr) {
      return res.status(400).json({
        isRevokedQr: true,
        message: `LUMANG QR PASS (REVOKED): Ang QR Code na ito (${rawCode}) ay pinalitan na ng bago noong ${new Date(revokedDetails?.revokedAt || Date.now()).toLocaleDateString()}. Mangyaring buksan ang Mobile App upang maipakita ang pinakabagong QR Pass (${household.qrCode}).`,
        activeQrCode: household.qrCode,
        household: {
          ...household.toObject(),
          name: household.headOfHouseholdUserId?.name || 'Beneficiary Head',
          familyHeadcount: household.memberCount || 1,
          activeQrCode: household.qrCode,
        },
      });
    }

    const pastRequests = await AssistanceRequest.find({ householdId: { $in: relatedHhIds } }).sort({ requestedAt: -1 });
    const pastDistributions = await Distribution.find({ householdId: { $in: relatedHhIds } }).sort({ releasedAt: -1 });

    // Active requests for this household
    const activeRequests = pastRequests.filter(r => ['pending', 'approved', 'under_review'].includes(r.status));
    
    // Parse package breakdown for scanner screen
    const requestedPackages = {
      food: true, // Food pack is base entitlement for verified households
      water: false,
      medical: false,
      infant: false,
      senior: false,
      customList: [],
    };

    activeRequests.forEach(req => {
      if (Array.isArray(req.packages) && req.packages.length > 0) {
        req.packages.forEach(p => {
          const pid = (p.id || p.name || '').toLowerCase();
          if (pid.includes('food')) requestedPackages.food = true;
          if (pid.includes('water')) requestedPackages.water = true;
          if (pid.includes('med')) requestedPackages.medical = true;
          if (pid.includes('infant') || pid.includes('baby')) requestedPackages.infant = true;
          if (pid.includes('senior') || pid.includes('hygiene')) requestedPackages.senior = true;
          requestedPackages.customList.push(p.name || p.id);
        });
      } else if (req.itemType) {
        const it = req.itemType.toLowerCase();
        if (it.includes('water')) requestedPackages.water = true;
        if (it.includes('med') || it.includes('gamot')) requestedPackages.medical = true;
        if (it.includes('infant') || it.includes('baby')) requestedPackages.infant = true;
        if (it.includes('senior') || it.includes('hygiene')) requestedPackages.senior = true;
        requestedPackages.customList.push(req.itemType);
      }
    });

    // Compute standard relief quantity recommendation based on ReliefItemType configs and PolicyConfig
    const ReliefItemType = require('../models/ReliefItemType');
    const PolicyConfig = require('../models/PolicyConfig');
    const policy = await PolicyConfig.findOne({ key: 'relief_allocation' });
    const activeBase = (policy && policy.baseCoverage) ? policy.baseCoverage : 5;
    const itemConfigs = await ReliefItemType.find({});
    const recommendations = {};

    if (itemConfigs && itemConfigs.length > 0) {
      itemConfigs.forEach((cfg) => {
        recommendations[cfg.name] = calculateReliefAllocation(household.memberCount, policy?.baseCoverage || cfg.baseCoverage, cfg.category);
      });
    } else {
      recommendations['Family Food Pack'] = calculateReliefAllocation(household.memberCount, activeBase, 'headcount_scaled');
      recommendations['Hygiene Kit'] = calculateReliefAllocation(household.memberCount, activeBase, 'headcount_scaled');
    }
    
    const entitlement = calculateHouseholdEntitlement(household, policy);
    const gapAnalysis = detectAssistanceGaps(pastRequests, pastDistributions);

    const enrichedHousehold = {
      ...(typeof household.toObject === 'function' ? household.toObject() : household),
      name: household.headOfHouseholdUserId?.name || 'Beneficiary Head',
      familyHeadcount: household.memberCount || 1,
      entitlement: entitlement?.summaryText || `${entitlement?.basePacks || 1}x Base Relief Pack`,
    };

    res.json({
      household: enrichedHousehold,
      isVerified: household.verificationStatus === 'verified',
      priorityLevel: household.priorityLevel,
      priorityScore: household.priorityScore,
      entitlement,
      recommendations,
      pastDistributions,
      activeRequests,
      requestedPackages,
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

// @route   POST /api/households/regenerate-qr
// @desc    Revoke and regenerate a compromised QR code (Resident for own pass, or Barangay Official)
router.post('/regenerate-qr', protect, async (req, res) => {
  try {
    let household;
    const { householdId, reason } = req.body;

    if (req.user.role === 'resident') {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: 'Kailangan ang inyong account password upang ma-renew ang inyong QR Pass.' });
      }
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User account not found.' });
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Maling password. Hindi mapalitan ang QR Pass nang walang tamang password para sa inyong seguridad.' });
      }
      household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    } else if (['barangay_official', 'lgu_admin', 'lgu_superadmin'].includes(req.user.role)) {
      if (!householdId) {
        return res.status(400).json({ message: 'householdId is required when admin requests QR regeneration.' });
      }
      household = await Household.findById(householdId);
    }

    if (!household) {
      return res.status(404).json({ message: 'Household record not found.' });
    }

    // Rate Limiting: Residents can only regenerate QR once every 30 days unless overridden by Barangay Official
    if (req.user.role === 'resident' && household.lastQrRegeneratedAt) {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const timeSinceLast = Date.now() - new Date(household.lastQrRegeneratedAt).getTime();
      if (timeSinceLast < THIRTY_DAYS_MS) {
        const remainingDays = Math.ceil((THIRTY_DAYS_MS - timeSinceLast) / (24 * 60 * 60 * 1000));
        return res.status(400).json({
          message: `Maaari lamang mag-regenerate ng QR Code isang beses bawat 30 araw upang maiwasan ang pang-aabuso. Huling pinalitan noong ${new Date(household.lastQrRegeneratedAt).toLocaleDateString()}. Makipag-ugnayan sa inyong Barangay Official para sa emergency security renewal (${remainingDays} araw pa ang hihintayin).`,
          remainingDays,
          lastRegeneratedAt: household.lastQrRegeneratedAt,
        });
      }
    }

    const crypto = require('crypto');
    const oldQr = household.qrCode;
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const newQr = `MNL-${household.barangayCode}-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    if (!Array.isArray(household.previousQrCodes)) {
      household.previousQrCodes = [];
    }
    if (oldQr) {
      household.previousQrCodes.push({
        code: oldQr,
        revokedAt: new Date(),
        reason: reason || 'Security renewal / suspected leak',
      });
    }

    household.qrCode = newQr;
    household.lastQrRegeneratedAt = new Date();
    await household.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'QR_REVOKED_AND_REGENERATED',
      targetType: 'Household',
      targetId: household._id.toString(),
      notes: `Old QR '${oldQr}' revoked. New QR issued: '${newQr}'. Reason: ${reason || 'Security renewal / suspected leak'}`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`household:${household._id}`).emit('qr_code_regenerated', {
        newQrCode: newQr,
        revokedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Matagumpay na na-revoke ang lumang QR code at naglabas ng bagong Secure QR Pass!',
      oldQrCode: oldQr,
      newQrCode: newQr,
      household,
      lastQrRegeneratedAt: household.lastQrRegeneratedAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error regenerating QR code', error: error.message });
  }
});

// @route   GET /api/households/offline-cache
// @desc    Pre-download verified households for Field Staff Offline Mode scanning
router.get('/offline-cache', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { barangayCode } = req.query;
    let query = { verificationStatus: 'verified' };
    if (barangayCode && barangayCode !== 'ALL' && barangayCode !== 'City-Wide') {
      query.barangayCode = barangayCode;
    }

    const households = await Household.find(query)
      .populate('headOfHouseholdUserId', 'name emailOrPhone')
      .select('address purok barangayCode memberCount qrCode priorityLevel verificationStatus headOfHouseholdUserId previousQrCodes');

    const cacheDataset = households.map(h => ({
      _id: h._id,
      id: h._id,
      qrCode: h.qrCode,
      previousQrCodes: Array.isArray(h.previousQrCodes) ? h.previousQrCodes : [],
      name: h.headOfHouseholdUserId?.name || 'Beneficiary',
      address: `${h.address}, ${h.purok ? `Purok ${h.purok}, ` : ''}Brgy ${h.barangayCode}`,
      barangayCode: h.barangayCode,
      memberCount: h.memberCount || 1,
      priorityLevel: h.priorityLevel || 'High',
      isVerified: true,
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: cacheDataset.length,
      households: cacheDataset,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating offline cache', error: error.message });
  }
});

// @route   GET /api/households/me/notifications
// @desc    Get in-app notifications for current resident household
router.get('/me/notifications', protect, requireRole('resident'), async (req, res) => {
  try {
    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) return res.status(404).json({ message: 'Household not found' });

    res.json({
      notifications: household.inAppNotifications || [],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// @route   PATCH /api/households/me/notifications/:id/read
// @desc    Mark in-app notification as read
router.patch('/me/notifications/:id/read', protect, requireRole('resident'), async (req, res) => {
  try {
    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) return res.status(404).json({ message: 'Household not found' });

    if (household.inAppNotifications) {
      const notif = household.inAppNotifications.find(n => n.id === req.params.id || n._id?.toString() === req.params.id);
      if (notif) notif.isRead = true;
      await household.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification read', error: error.message });
  }
});

// @route   GET /api/households/qr-image/:code
// @desc    Generate an authentic, high-resolution PNG QR Code via official standard
router.get('/qr-image/:code', protect, async (req, res) => {
  try {
    const rawCode = String(req.params.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ message: 'QR Code value is required.' });
    }

    const width = parseInt(req.query.size, 10) || 400;
    const margin = parseInt(req.query.margin, 10) || 2;

    const buffer = await QRCode.toBuffer(rawCode, {
      type: 'png',
      width: Math.min(Math.max(width, 150), 1000),
      margin: Math.min(Math.max(margin, 1), 10),
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.send(buffer);
  } catch (error) {
    console.error('Error generating QR image:', error);
    res.status(500).json({ message: 'Error generating QR code image', error: error.message });
  }
});

// @route   POST /api/households/decode-qr-image
// @desc    Decode QR code from uploaded or snapped image base64 via API
router.post('/decode-qr-image', protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Walang litratong natanggap.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Di-wastong format ng litrato.' });
    }

    // 1. Primary: High-speed local decoder (PNG/JPEG via jsQR)
    const localResult = await decodeImageBuffer(buffer);
    if (localResult.success && localResult.qrCode) {
      return res.json({
        success: true,
        qrCode: localResult.qrCode.trim(),
        source: `backend-${localResult.format}`,
      });
    }

    // 2. Secondary fallback: Cloud QR Server API
    const cloudResult = await decodeViaQrServer(buffer);
    if (cloudResult.success && cloudResult.qrCode) {
      return res.json({
        success: true,
        qrCode: cloudResult.qrCode.trim(),
        source: 'cloud-api',
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Hindi ma-detect ang QR Code sa litrato. Pakitiyak na malinaw at maliwanag ang pagkakuha ng QR Pass.',
    });
  } catch (error) {
    console.error('Error decoding QR image:', error);
    res.status(500).json({ success: false, message: 'Error sa pagsusuri ng QR code', error: error.message });
  }
});

module.exports = router;

