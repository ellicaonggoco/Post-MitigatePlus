const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/incidents
// @desc    Field staff reports an incident (stock shortage, lost QR pass, emergency, etc.)
router.post('/', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { incidentType, notes, distributionEventId, barangayCode, gpsLocation, photoUri } = req.body;
    if (!incidentType || !notes || !notes.trim()) {
      return res.status(400).json({ message: 'incidentType and notes are required.' });
    }

    const bCode = barangayCode || req.user.barangayCode || '291';

    const incident = await Incident.create({
      incidentType,
      notes: notes.trim(),
      reportedBy: req.user._id,
      barangayCode: String(bCode),
      distributionEventId: distributionEventId || null,
      gpsLocation: gpsLocation || null,
      photoUri: photoUri || null,
      status: 'open',
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reportedBy', 'name role email contactNum teamName staffDesignation')
      .populate('distributionEventId', 'title location');

    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: incident._id,
        incidentType,
        notes: incident.notes,
        barangayCode: String(bCode),
        reportedByName: req.user.name || req.user.fullName || 'Field Staff',
        reportedByRole: req.user.role || 'field_staff',
        reportedByTeam: req.user.teamName || 'MDRRMO Field Operations',
        reportedAt: incident.createdAt,
        status: incident.status,
        gpsLocation: incident.gpsLocation,
        photoUri: incident.photoUri,
      };
      io.to('admin_room').emit('new_field_incident', payload);
      io.emit('new_field_incident', payload);
    }

    res.status(201).json({ success: true, incident: populatedIncident || incident });
  } catch (error) {
    console.error('Error submitting incident report:', error);
    res.status(500).json({ message: 'Error submitting incident report', error: error.message });
  }
});

// @route   GET /api/incidents
// @desc    List incidents - scoped to barangay for officials, city-wide for LGU/SuperAdmin
router.get('/', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'barangay_official') {
      query.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode && req.query.barangayCode !== 'all') {
      query.barangayCode = req.query.barangayCode;
    }

    if (req.query.reportedBy === 'me' || req.query.myReports === 'true') {
      query.reportedBy = req.user._id;
    } else if (req.query.reportedBy) {
      query.reportedBy = req.query.reportedBy;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.incidentType && req.query.incidentType !== 'all') {
      query.incidentType = req.query.incidentType;
    }

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name role email contactNum teamName staffDesignation')
      .populate('resolvedBy', 'name role')
      .populate('distributionEventId', 'title location')
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
});

// @route   PATCH /api/incidents/:id
// @desc    Update incident status (open -> acknowledged -> resolved), resolution notes & structured details
router.patch('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { status, resolutionNotes, resolutionDetails } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    if (status) incident.status = status;
    if (resolutionNotes !== undefined) incident.resolutionNotes = resolutionNotes;
    if (resolutionDetails !== undefined) {
      incident.resolutionDetails = {
        ...(incident.resolutionDetails?.toObject?.() || {}),
        ...resolutionDetails,
      };
    }
    if (status === 'resolved') {
      incident.resolvedAt = new Date();
      incident.resolvedBy = req.user._id;
    }

    await incident.save();

    const updated = await Incident.findById(incident._id)
      .populate('reportedBy', 'name role email contactNum teamName staffDesignation')
      .populate('resolvedBy', 'name role')
      .populate('distributionEventId', 'title location');

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('field_incident_updated', updated);
      io.emit('field_incident_updated', updated);
    }

    res.json({ success: true, incident: updated });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ message: 'Error updating incident status', error: error.message });
  }
});

// @route   DELETE /api/incidents/:id
// @desc    Delete an incident report (SuperAdmin only)
router.delete('/:id', protect, requireRole('lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json({ success: true, message: 'Incident removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting incident', error: error.message });
  }
});

module.exports = router;
