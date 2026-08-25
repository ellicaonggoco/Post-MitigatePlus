const express = require('express');
const router = express.Router();
const AssistanceRequest = require('../models/AssistanceRequest');
const Household = require('../models/Household');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/assistance-requests
// @desc    Submit a new assistance request (Resident only)
router.post('/', protect, requireRole('resident'), async (req, res) => {
  try {
    const { itemType, notes } = req.body;
    if (!itemType) {
      return res.status(400).json({ message: 'Please specify the assistance item type needed.' });
    }

    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    if (!household) {
      return res.status(404).json({ message: 'Household record not found.' });
    }

    if (household.verificationStatus !== 'verified') {
      return res.status(400).json({ message: 'Only verified households can request assistance.' });
    }

    const request = await AssistanceRequest.create({
      householdId: household._id,
      itemType,
      notes: notes || '',
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assistance request', error: error.message });
  }
});

// @route   GET /api/assistance-requests
// @desc    Get assistance requests — scoped to the barangay_official's own barangay,
//          city-wide for lgu_admin (same pattern as /households/pending)
router.get('/', protect, requireRole('barangay_official', 'lgu_admin', 'field_staff'), async (req, res) => {
  try {
    const householdFilter = {};
    if (req.user.role === 'barangay_official' || req.user.role === 'field_staff') {
      householdFilter.barangayCode = req.user.barangayCode;
    } else if (req.query.barangayCode) {
      householdFilter.barangayCode = req.query.barangayCode;
    }

    let householdIds = null;
    if (Object.keys(householdFilter).length > 0) {
      const households = await Household.find(householdFilter).select('_id');
      householdIds = households.map(h => h._id);
    }

    const query = householdIds ? { householdId: { $in: householdIds } } : {};

    const requests = await AssistanceRequest.find(query)
      .populate({
        path: 'householdId',
        select: 'address purok barangayCode memberCount priorityLevel priorityScore headOfHouseholdUserId latitude longitude',
        populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' }
      })
      .populate('assignedStaff', 'name emailOrPhone teamName staffDesignation')
      .populate('deliveredBy', 'name emailOrPhone teamName')
      .populate('decidedBy', 'name emailOrPhone')
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assistance requests', error: error.message });
  }
});

// @route   PATCH /api/assistance-requests/:id/assign
// @desc    LGU Admin assigns field staff officer/team for door-to-door delivery
router.patch('/:id/assign', protect, requireRole('lgu_admin', 'lgu_superadmin', 'barangay_official'), async (req, res) => {
  try {
    const { assignedStaffId } = req.body;
    const request = await AssistanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    request.assignedStaff = assignedStaffId || null;
    request.status = 'approved';
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    await request.save();

    const io = req.app.get('io');
    if (io && assignedStaffId) {
      io.to(`staff:${assignedStaffId}`).emit('new_delivery_task', {
        requestId: request._id,
        itemType: request.itemType,
      });
    }

    res.json({ message: 'Staff successfully assigned for door-to-door delivery.', request });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning staff', error: error.message });
  }
});

// @route   PATCH /api/assistance-requests/:id/deliver
// @desc    Field Staff completes door-to-door delivery with Proof of Delivery Photo & Signature
router.patch('/:id/deliver', protect, requireRole('field_staff', 'barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { proofOfDeliveryPhoto, recipientSignatureOrNotes, notes } = req.body;
    const request = await AssistanceRequest.findById(req.params.id).populate('householdId');
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    request.status = 'received';
    request.deliveredBy = req.user._id;
    request.deliveredAt = new Date();
    if (proofOfDeliveryPhoto) request.proofOfDeliveryPhoto = proofOfDeliveryPhoto;
    if (recipientSignatureOrNotes) request.recipientSignatureOrNotes = recipientSignatureOrNotes;
    if (notes) request.notes = notes;
    await request.save();

    const io = req.app.get('io');
    if (io) {
      if (request.householdId) {
        io.to(`household:${request.householdId._id}`).emit('assistance_delivered', {
          requestId: request._id,
          deliveredAt: request.deliveredAt,
          deliveredByName: req.user.name,
        });
      }
      io.to(`barangay:${request.householdId?.barangayCode || '291'}`).emit('assistance_request_completed', {
        requestId: request._id,
        deliveredAt: request.deliveredAt,
      });
    }

    res.json({
      message: 'Door-to-Door Delivery marked as successfully completed with Proof of Handover!',
      request,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing delivery', error: error.message });
  }
});

// @route   PATCH /api/assistance-requests/:id
// @desc    Approve / reject / update status of an assistance request
router.patch('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'field_staff'), async (req, res) => {
  try {
    const { status, proofOfDeliveryPhoto, recipientSignatureOrNotes } = req.body;
    const validStatuses = ['pending', 'under_review', 'approved', 'released', 'received'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const request = await AssistanceRequest.findById(req.params.id).populate('householdId', 'barangayCode');
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    if (req.user.role === 'barangay_official' && request.householdId?.barangayCode !== req.user.barangayCode) {
      return res.status(403).json({ message: 'Forbidden: this request is outside your assigned barangay.' });
    }

    request.status = status;
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    if (status === 'received' || status === 'released') {
      request.deliveredBy = req.user._id;
      request.deliveredAt = new Date();
      if (proofOfDeliveryPhoto) request.proofOfDeliveryPhoto = proofOfDeliveryPhoto;
      if (recipientSignatureOrNotes) request.recipientSignatureOrNotes = recipientSignatureOrNotes;
    }
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error updating assistance request', error: error.message });
  }
});

module.exports = router;
