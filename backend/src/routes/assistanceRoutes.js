const express = require('express');
const router = express.Router();
const AssistanceRequest = require('../models/AssistanceRequest');
const Household = require('../models/Household');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/assistance-requests
// @desc    Submit a new assistance request (Resident or Official on behalf of household)
router.post('/', protect, requireRole('resident', 'barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { itemType, items, packages, reason, notes, resident, barangay, householdId } = req.body;
    let formattedPackages = [];
    if (Array.isArray(packages) && packages.length > 0) {
      formattedPackages = packages.map(p => typeof p === 'string' ? { id: p, name: p, quantity: 1 } : p);
    }

    let requestedItem = itemType || items;
    if (!requestedItem && formattedPackages.length > 0) {
      requestedItem = formattedPackages.map(p => p.name || p.id).join(', ');
    }
    if (!requestedItem) {
      requestedItem = 'Emergency Family Relief Package';
    }

    const requestNotes = reason || notes || '';

    let targetHousehold = null;
    if (req.user.role === 'resident') {
      targetHousehold = await Household.findOne({ headOfHouseholdUserId: req.user._id });
      if (!targetHousehold) {
        return res.status(404).json({ message: 'Household record not found.' });
      }
    } else {
      // Official / Admin submitted on behalf of household
      if (householdId) {
        targetHousehold = await Household.findById(householdId);
      } else {
        const brgyCode = barangay || req.user.barangayCode || '291';
        targetHousehold = await Household.findOne({ barangayCode: brgyCode });
        if (!targetHousehold) {
          targetHousehold = await Household.findOne();
        }
      }
    }

    const request = await AssistanceRequest.create({
      householdId: targetHousehold ? targetHousehold._id : null,
      itemType: requestedItem,
      packages: formattedPackages,
      notes: requestNotes,
      status: 'pending',
      requestedBy: req.user.role === 'resident' ? req.user.name : `Official: ${req.user.name}`,
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assistance request', error: error.message });
  }
});

// @route   GET /api/assistance-requests/demand-summary
// @desc    Get aggregated package demand totals for batch warehouse packaging & staff logistics
router.get('/demand-summary', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
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
    // Only count active (pending or approved/under_review) demands
    const activeRequests = await AssistanceRequest.find({
      ...query,
      status: { $in: ['pending', 'under_review', 'approved'] },
    }).populate('householdId', 'memberCount priorityLevel address barangayCode');

    const summary = {
      totalRequests: activeRequests.length,
      pendingCount: activeRequests.filter(r => r.status === 'pending').length,
      approvedCount: activeRequests.filter(r => r.status === 'approved' || r.status === 'under_review').length,
      categories: {
        food: { id: 'food', name: 'Basic Food Pack', count: 0, icon: '🍚' },
        water: { id: 'water', name: 'Drinking Water Pack', count: 0, icon: '💧' },
        medical: { id: 'medical', name: 'Medical Kit', count: 0, icon: '💊' },
        infant: { id: 'infant', name: 'Baby/Infant Pack', count: 0, icon: '👶' },
        senior: { id: 'senior', name: 'Senior/Hygiene Kit', count: 0, icon: '🧓' },
      },
    };

    activeRequests.forEach((req) => {
      const str = `${req.itemType || ''} ${req.notes || ''}`.toLowerCase();
      const hasPkgs = Array.isArray(req.packages) && req.packages.length > 0;

      // Check packages array first
      if (hasPkgs) {
        req.packages.forEach((pkg) => {
          const pkgId = (pkg.id || pkg.name || '').toLowerCase();
          if (pkgId.includes('food') || pkgId.includes('pagkain') || pkgId.includes('bigas')) summary.categories.food.count++;
          if (pkgId.includes('water') || pkgId.includes('tubig')) summary.categories.water.count++;
          if (pkgId.includes('med') || pkgId.includes('gamot') || pkgId.includes('first aid')) summary.categories.medical.count++;
          if (pkgId.includes('infant') || pkgId.includes('baby') || pkgId.includes('gatas') || pkgId.includes('diaper')) summary.categories.infant.count++;
          if (pkgId.includes('senior') || pkgId.includes('hygiene') || pkgId.includes('toiletries')) summary.categories.senior.count++;
        });
      } else {
        // Fallback string matching
        if (str.includes('food') || str.includes('pagkain') || str.includes('bigas') || str.includes('relief pack') || str.includes('package')) summary.categories.food.count++;
        if (str.includes('water') || str.includes('tubig')) summary.categories.water.count++;
        if (str.includes('med') || str.includes('gamot') || str.includes('first aid')) summary.categories.medical.count++;
        if (str.includes('infant') || str.includes('baby') || str.includes('gatas') || str.includes('diaper')) summary.categories.infant.count++;
        if (str.includes('senior') || str.includes('hygiene') || str.includes('toiletries')) summary.categories.senior.count++;
      }
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating demand summary', error: error.message });
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
router.patch('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
  try {
    const { status, notes, assignedStaff, proofOfDeliveryPhoto, recipientSignatureOrNotes } = req.body;
    let normalizedStatus = typeof status === 'string' ? status.toLowerCase().trim() : '';
    if (normalizedStatus === 'rejected') normalizedStatus = 'rejected';
    if (normalizedStatus === 'approved') normalizedStatus = 'approved';

    const validStatuses = ['pending', 'under_review', 'approved', 'released', 'received', 'rejected'];
    if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const request = await AssistanceRequest.findById(req.params.id).populate('householdId', 'barangayCode');
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    if (req.user.role === 'barangay_official' && request.householdId?.barangayCode && request.householdId?.barangayCode !== req.user.barangayCode) {
      return res.status(403).json({ message: 'Forbidden: this request is outside your assigned barangay.' });
    }

    if (normalizedStatus) request.status = normalizedStatus;
    if (notes !== undefined) request.notes = notes;
    if (assignedStaff !== undefined) request.assignedStaff = assignedStaff;
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    if (normalizedStatus === 'received' || normalizedStatus === 'released') {
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
