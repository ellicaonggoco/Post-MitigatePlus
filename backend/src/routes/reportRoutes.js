const express = require('express');
const router = express.Router();
const Household = require('../models/Household');
const Distribution = require('../models/Distribution');
const RecoveryStatus = require('../models/RecoveryStatus');
const AuditLog = require('../models/AuditLog');
const AssistanceRequest = require('../models/AssistanceRequest');
const { protect, requireRole, requireBarangayScope } = require('../middleware/auth');
const { detectAssistanceGaps } = require('../utils/gapDetection');

// @route   GET /api/reports/summary
router.get('/summary', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), requireBarangayScope, async (req, res) => {
  try {
    let query = {};
    const brgy = req.query.barangayCode || (req.user.role === 'barangay_official' ? req.user.barangayCode : null);
    if (brgy) {
      query.barangayCode = brgy;
    }

    const isUnfiltered = Object.keys(query).length === 0;

    // Scoped household ids are needed to count Distributions/AuditLogs correctly,
    // since those collections reference householdId rather than storing barangayCode directly.
    const scopedHouseholdIds = brgy
      ? (await Household.find(query).select('_id')).map(h => h._id)
      : null;

    const [
      totalHouseholds,
      pendingVerifications,
      verifiedHouseholds,
      highPriorityHouseholds,
      membersAgg,
      recoveryStages,
      duplicateAttemptsCount,
      totalDistributions,
      activeEvents,
    ] = await Promise.all([
      isUnfiltered ? Household.estimatedDocumentCount() : Household.countDocuments(query),
      Household.countDocuments({ ...query, verificationStatus: 'pending' }),
      Household.countDocuments({ ...query, verificationStatus: 'verified' }),
      Household.countDocuments({ ...query, priorityLevel: 'High' }),
      Household.aggregate([
        { $match: query },
        { $group: { _id: null, totalMembers: { $sum: '$memberCount' } } }
      ]),
      RecoveryStatus.aggregate([
        ...(scopedHouseholdIds ? [{ $match: { householdId: { $in: scopedHouseholdIds } } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).catch(() => []),
      // Real count, not hardcoded — matches the same action name /duplicate-attempts already queries
      AuditLog.countDocuments({
        action: 'DUPLICATE_CLAIM_BLOCKED',
        ...(scopedHouseholdIds ? { targetId: { $in: scopedHouseholdIds.map(id => id.toString()) } } : {}),
      }),
      Distribution.countDocuments(scopedHouseholdIds ? { householdId: { $in: scopedHouseholdIds } } : {}),
      require('../models/DistributionEvent').countDocuments({
        isActive: true,
        ...(brgy ? { barangayCode: brgy } : {}),
      }),
    ]);

    const totalMembers = membersAgg[0]?.totalMembers || (totalHouseholds * 4);

    let stageMap = {};
    (recoveryStages || []).forEach(s => {
      stageMap[s._id] = s.count;
    });

    res.json({
      totalHouseholds,
      pendingVerifications,
      verifiedHouseholds,
      highPriorityHouseholds,
      totalMembers,
      totalBarangays: 897,
      duplicateAttemptsCount,
      totalDistributions,
      activeEvents,
      waitingAyuda: stageMap['waiting'] || 0,
      assistanceReceived: stageMap['assistance_received'] || 0,
      ongoingRecovery: stageMap['ongoing'] || 0,
      partiallyRecovered: stageMap['partially_recovered'] || 0,
      fullyRecovered: stageMap['fully_recovered'] || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report summary', error: error.message });
  }
});

// @route   GET /api/reports/duplicate-attempts
router.get('/duplicate-attempts', protect, requireRole('barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ action: 'DUPLICATE_CLAIM_BLOCKED' })
      .populate('actorUserId', 'name role')
      .sort({ timestamp: -1 });

    if (req.user.role === 'lgu_admin') {
      return res.json(logs);
    }

    // Scope to this barangay official's own barangay households only
    const households = await Household.find({ barangayCode: req.user.barangayCode }).select('_id');
    const scopedIds = new Set(households.map(h => h._id.toString()));
    const scopedLogs = logs.filter(l => scopedIds.has(l.targetId));

    res.json(scopedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching duplicate logs', error: error.message });
  }
});

// @route   GET /api/reports/gap-analysis
router.get('/gap-analysis', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), requireBarangayScope, async (req, res) => {
  try {
    let query = { verificationStatus: 'verified' };
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    }

    const households = await Household.find(query).populate('headOfHouseholdUserId', 'name');
    const report = await Promise.all(households.map(async (hh) => {
      const distributions = await Distribution.find({ householdId: hh._id });
      
      const memberCount = Number(hh.memberCount || 1);
      // Right-sized calculation according to DSWD / LGU Policy:
      // 1 to 4 members = 1 Base Food Pack
      // 5 to 8 members = 2 Base Food Packs
      // 9+ members = 3 Base Food Packs
      const basePackCount = memberCount >= 9 ? 3 : memberCount >= 5 ? 2 : 1;
      
      const gapsList = [];
      const hasFoodDistribution = distributions.some(d => (d.itemType || '').toLowerCase().includes('food') || (d.itemType || '').toLowerCase().includes('pack'));
      const hasWaterDistribution = distributions.some(d => (d.itemType || '').toLowerCase().includes('water') || (d.itemType || '').toLowerCase().includes('tubig'));

      if (!hasFoodDistribution) {
        gapsList.push(`Family Food Pack (x${basePackCount} Base Pack${basePackCount > 1 ? 's' : ''})`);
      }
      if (!hasWaterDistribution) {
        gapsList.push('Drinking Water (10L Jug)');
      }

      // Check if senior or infant members
      const hasSenior = (hh.members || []).some(m => Number(m.age) >= 60);
      const hasInfant = (hh.members || []).some(m => Number(m.age) <= 3);
      if (hasSenior) {
        const hasSeniorDist = distributions.some(d => (d.itemType || '').toLowerCase().includes('senior') || (d.itemType || '').toLowerCase().includes('hygiene'));
        if (!hasSeniorDist) gapsList.push('Senior Care / Hygiene Kit');
      }
      if (hasInfant) {
        const hasInfantDist = distributions.some(d => (d.itemType || '').toLowerCase().includes('infant') || (d.itemType || '').toLowerCase().includes('baby'));
        if (!hasInfantDist) gapsList.push('Infant / Baby Pack');
      }

      return {
        id: String(hh._id),
        householdId: String(hh._id),
        headName: hh.headOfHouseholdUserId?.name || hh.headName || 'Resident Household',
        address: hh.address ? `${hh.address}, Purok ${hh.purok || 1}` : 'Barangay 291, Manila',
        purok: hh.purok || 1,
        barangayCode: hh.barangayCode || '291',
        memberCount: memberCount,
        priorityLevel: hh.priorityLevel || (memberCount >= 5 ? 'High' : 'Low'),
        gaps: gapsList,
        totalGaps: gapsList.length,
      };
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error generating gap analysis', error: error.message });
  }
});

// @route   GET /api/reports/coa-liquidation
// @desc    Export official COA / DSWD DROMIC-compliant liquidation masterlist
router.get('/coa-liquidation', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), requireBarangayScope, async (req, res) => {
  try {
    const { barangayCode, distributionEventId } = req.query;
    let query = {};
    if (distributionEventId) query.distributionEventId = distributionEventId;

    let householdFilter = {};
    if (req.user.role === 'barangay_official') {
      householdFilter.barangayCode = req.user.barangayCode;
    } else if (barangayCode && barangayCode !== 'ALL') {
      householdFilter.barangayCode = barangayCode;
    }

    if (Object.keys(householdFilter).length > 0) {
      const hhList = await Household.find(householdFilter).select('_id');
      query.householdId = { $in: hhList.map(h => h._id) };
    }

    const distributions = await Distribution.find(query)
      .populate({
        path: 'householdId',
        select: 'address purok barangayCode memberCount priorityLevel priorityScore qrCode headOfHouseholdUserId validIdType validIdNumber',
        populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone contactNum' }
      })
      .populate('distributionEventId', 'title location scheduledDate itemType')
      .populate('releasedBy', 'name emailOrPhone teamName staffDesignation')
      .sort({ releasedAt: -1 });

    const rows = distributions.map((d, index) => {
      const hh = d.householdId || {};
      const head = hh.headOfHouseholdUserId || {};
      const ev = d.distributionEventId || {};
      const staff = d.releasedBy || {};

      return {
        itemNo: index + 1,
        claimReceiptNo: `RCPT-${new Date(d.releasedAt).getFullYear()}-${d._id.toString().slice(-6).toUpperCase()}`,
        beneficiaryName: head.name || 'Resident Beneficiary',
        contactNumber: head.contactNum || head.emailOrPhone || 'N/A',
        address: `${hh.address || 'Address'}, Purok ${hh.purok || '1'}`,
        barangay: `Barangay ${hh.barangayCode || '291'}`,
        qrCode: hh.qrCode || 'N/A',
        validId: `${hh.validIdType || 'Gov ID'} ${hh.validIdNumber ? `(${hh.validIdNumber})` : ''}`.trim(),
        familySize: d.householdSizeAtDistribution || hh.memberCount || 1,
        priorityLevel: hh.priorityLevel || 'Medium',
        eventTitle: ev.title || 'Relief Distribution Drive',
        reliefItem: d.itemType || ev.itemType || 'Family Food Pack',
        basePacks: d.baseUnitsGiven || 1,
        topUpPacks: d.topUpUnitsGiven || 0,
        totalPacksReleased: (d.baseUnitsGiven || 1) + (d.topUpUnitsGiven || 0),
        disbursingOfficer: staff.name || 'Field Officer',
        disbursingTeam: staff.teamName || 'Field Operations',
        dateTimeClaimed: new Date(d.releasedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        timestampIso: d.releasedAt,
        overrideReason: d.overrideReason || 'Standard DSWD Allocation',
      };
    });

    res.json({
      success: true,
      reportTitle: 'Republic of the Philippines — City of Manila Disaster Relief Assistance Liquidation Masterlist',
      complianceStandard: 'Commission on Audit (COA) Circular 2014-002 / DSWD DROMIC Relief Distribution Standards',
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name,
      totalBeneficiariesClaimed: rows.length,
      totalPacksDistributed: rows.reduce((sum, r) => sum + r.totalPacksReleased, 0),
      records: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating COA liquidation masterlist', error: error.message });
  }
});

module.exports = router;
