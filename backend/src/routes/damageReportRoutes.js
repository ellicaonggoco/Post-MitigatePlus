const express = require('express');
const router = express.Router();
const DamageReport = require('../models/DamageReport');
const Household = require('../models/Household');
const { protect, requireRole } = require('../middleware/auth');
const { calculatePriorityIndex } = require('../utils/priorityIndex');

// @route   POST /api/damage-reports
// @desc    Resident submits a damage report for their own household
router.post('/', protect, requireRole('resident'), async (req, res) => {
  try {
    const { damageLevel, photos, description, latitude, longitude, locationName } = req.body;
    const normalizedLevel = (damageLevel === 'Total' || damageLevel === 'Totally Damaged') ? 'Totally Damaged' : damageLevel;
    const validLevels = ['Minor', 'Moderate', 'Severe', 'Totally Damaged'];
    if (!validLevels.includes(normalizedLevel)) {
      return res.status(400).json({ message: `damageLevel must be one of: ${validLevels.join(', ')}` });
    }

    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) {
      return res.status(404).json({ message: 'Household record not found for this account.' });
    }

    // Whitelist and sanitize photo uploads
    let sanitizedPhotos = [];
    if (Array.isArray(photos)) {
      sanitizedPhotos = photos.slice(0, 5).filter(p => {
        if (typeof p !== 'string') return false;
        const trimmed = p.trim();
        // Allow valid HTTP/HTTPS URLs or base64 image data URIs
        const isUrl = /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif)$/i.test(trimmed);
        const isDataUri = /^data:image\/(jpeg|png|webp|avif);base64,/i.test(trimmed);
        const isStandardUrl = /^https?:\/\//i.test(trimmed);
        return isUrl || isDataUri || isStandardUrl;
      });
    }

    const numLat = typeof latitude === 'number' ? latitude : (latitude ? parseFloat(latitude) : null);
    const numLng = typeof longitude === 'number' ? longitude : (longitude ? parseFloat(longitude) : null);

    const report = await DamageReport.create({
      householdId: household._id,
      damageLevel: normalizedLevel,
      reportedDamageLevel: normalizedLevel,
      verificationStatus: 'pending',
      photos: sanitizedPhotos,
      description: typeof description === 'string' ? description.trim().slice(0, 1000) : '',
      latitude: !isNaN(numLat) ? numLat : null,
      longitude: !isNaN(numLng) ? numLng : null,
      locationName: typeof locationName === 'string' ? locationName.trim().slice(0, 200) : '',
    });

    if (!isNaN(numLat) && !isNaN(numLng)) {
      household.latitude = numLat;
      household.longitude = numLng;
      await household.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barangay:${household.barangayCode}`).emit('new_pending_damage_report', {
        reportId: report._id,
        householdId: household._id,
        damageLevel,
        address: household.address,
        barangayCode: household.barangayCode,
        reportedAt: report.reportedAt,
      });
    }

    res.status(201).json({
      message: 'Damage report submitted successfully. It is now pending review and photo verification by your Barangay Official.',
      report,
      household,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting damage report', error: error.message });
  }
});

// @route   GET /api/damage-reports
// @desc    List damage reports - resident sees their own, official/admin can filter by barangay/household
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'resident') {
      const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
      if (!household) return res.json([]);
      filter.householdId = household._id;
    } else if (req.query.householdId) {
      filter.householdId = req.query.householdId;
    } else if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }

    const reports = await DamageReport.find(filter)
      .populate('householdId')
      .populate('validatedBy', 'name emailOrPhone')
      .sort({ reportedAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching damage reports', error: error.message });
  }
});

// @route   PATCH /api/damage-reports/:id/validate
// @desc    Barangay Official or LGU Admin validates, adjusts, or rejects a damage report
router.patch('/:id/validate', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
  try {
    const { action, validatedDamageLevel, damageLevel, notes, rejectionReason } = req.body;
    const report = await DamageReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Damage report not found.' });

    const finalAction = action || (validatedDamageLevel ? 'verified' : 'verified');
    const finalLevel = validatedDamageLevel || damageLevel || report.reportedDamageLevel || report.damageLevel;

    if (finalAction === 'rejected') {
      report.verificationStatus = 'rejected';
      report.rejectionReason = rejectionReason || notes || 'Insufficient or non-matching photo evidence.';
      report.validatedBy = req.user._id;
      report.validatedAt = new Date();
      report.notes = notes || report.notes;
      await report.save();

      return res.json({
        message: 'Damage report rejected.',
        report,
      });
    }

    // Action is verify or adjust
    report.verificationStatus = finalAction === 'adjust' || finalLevel !== report.reportedDamageLevel ? 'adjusted' : 'verified';
    report.validatedDamageLevel = finalLevel;
    report.damageLevel = finalLevel;
    report.notes = notes || report.notes;
    report.validatedBy = req.user._id;
    report.validatedAt = new Date();
    await report.save();

    // Now update household damage level and recalculate official priority score
    const household = await Household.findById(report.householdId);
    if (household) {
      household.damageLevel = finalLevel;
      const { priorityScore, priorityLevel } = calculatePriorityIndex(household);
      household.priorityScore = priorityScore;
      household.priorityLevel = priorityLevel;
      await household.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`barangay:${household.barangayCode}`).emit('damage_report_verified', {
          householdId: household._id,
          verifiedDamageLevel: finalLevel,
          priorityScore,
          priorityLevel,
        });
      }

      return res.json({
        message: `Damage report successfully ${report.verificationStatus} as ${finalLevel}. Household Priority Score updated to ${priorityScore} (${priorityLevel}).`,
        report,
        updatedPriorityScore: priorityScore,
        updatedPriorityLevel: priorityLevel,
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error validating damage report', error: error.message });
  }
});

module.exports = router;
