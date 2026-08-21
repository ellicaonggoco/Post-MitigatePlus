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
        select: 'address purok barangayCode memberCount priorityLevel priorityScore headOfHouseholdUserId',
        populate: { path: 'headOfHouseholdUserId', select: 'name emailOrPhone' }
      })
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assistance requests', error: error.message });
  }
});

// @route   PATCH /api/assistance-requests/:id
// @desc    Approve / reject / update status of an assistance request
router.patch('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'field_staff'), async (req, res) => {
  try {
    const { status } = req.body;
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
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error updating assistance request', error: error.message });
  }
});

module.exports = router;
