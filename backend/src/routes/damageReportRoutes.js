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
    const validLevels = ['Minor', 'Moderate', 'Severe', 'Totally Damaged'];
    if (!validLevels.includes(damageLevel)) {
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
      damageLevel,
      photos: sanitizedPhotos,
      description: typeof description === 'string' ? description.trim().slice(0, 1000) : '',
      latitude: !isNaN(numLat) ? numLat : null,
      longitude: !isNaN(numLng) ? numLng : null,
      locationName: typeof locationName === 'string' ? locationName.trim().slice(0, 200) : '',
    });

    if (!isNaN(numLat) && !isNaN(numLng)) {
      household.latitude = numLat;
      household.longitude = numLng;
    }

    // Update the household's damage level and recompute priority — a new/updated damage
    // report is exactly the kind of thing that should move a household in the queue.
    household.damageLevel = damageLevel;
    const { priorityScore, priorityLevel } = calculatePriorityIndex(household);
    household.priorityScore = priorityScore;
    household.priorityLevel = priorityLevel;
    await household.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`barangay:${household.barangayCode}`).emit('damage_report_submitted', {
        householdId: household._id,
        damageLevel,
        priorityLevel,
      });
    }

    res.status(201).json({ report, updatedPriorityLevel: priorityLevel, updatedPriorityScore: priorityScore });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting damage report', error: error.message });
  }
});

// @route   GET /api/damage-reports?householdId=...
// @desc    List damage reports — resident sees their own, official/admin can filter by household
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'resident') {
      const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
      if (!household) return res.json([]);
      filter.householdId = household._id;
    } else if (req.query.householdId) {
      filter.householdId = req.query.householdId;
    }

    const reports = await DamageReport.find(filter).sort({ reportedAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching damage reports', error: error.message });
  }
});

// @route   PATCH /api/damage-reports/:id/validate
// @desc    Field staff validates/updates a damage report after physical inspection
router.patch('/:id/validate', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { damageLevel, notes } = req.body;
    const report = await DamageReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Damage report not found.' });

    if (damageLevel) report.damageLevel = damageLevel;
    report.notes = notes || report.notes;
    report.validatedBy = req.user._id;
    report.validatedAt = new Date();
    await report.save();

    if (damageLevel) {
      const household = await Household.findById(report.householdId);
      if (household) {
        household.damageLevel = damageLevel;
        const { priorityScore, priorityLevel } = calculatePriorityIndex(household);
        household.priorityScore = priorityScore;
        household.priorityLevel = priorityLevel;
        await household.save();
      }
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error validating damage report', error: error.message });
  }
});

module.exports = router;
