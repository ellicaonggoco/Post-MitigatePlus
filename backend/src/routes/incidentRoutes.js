const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/incidents
// @desc    Field staff reports an incident (stock shortage, lost QR pass, emergency, etc.)
router.post('/', protect, requireRole('field_staff', 'barangay_official'), async (req, res) => {
  try {
    const { incidentType, notes, distributionEventId } = req.body;
    if (!incidentType || !notes || !notes.trim()) {
      return res.status(400).json({ message: 'incidentType and notes are required.' });
    }

    const incident = await Incident.create({
      incidentType,
      notes: notes.trim(),
      reportedBy: req.user._id,
      barangayCode: req.user.barangayCode,
      distributionEventId: distributionEventId || null,
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('new_field_incident', {
        incidentType,
        notes,
        barangayCode: req.user.barangayCode,
        reportedByName: req.user.name,
        reportedAt: incident.createdAt,
      });
    }

    res.status(201).json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting incident report', error: error.message });
  }
});

// @route   GET /api/incidents
// @desc    List incidents — scoped to barangay for officials, city-wide for LGU/SuperAdmin
router.get('/', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode) {
      query.barangayCode = req.query.barangayCode;
    }

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
});

module.exports = router;
