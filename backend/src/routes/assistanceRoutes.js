const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AssistanceRequest = require('../models/AssistanceRequest');
const Household = require('../models/Household');
const User = require('../models/User');
const DistributionEvent = require('../models/DistributionEvent');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/assistance-requests
// @desc    Submit a new special relief request (Barangay Official or LGU Admin on behalf of vulnerable household)
router.post('/', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const {
      eventId,
      eventTitle,
      itemType,
      items,
      packages,
      reason,
      notes,
      resident,
      barangay,
      householdId,
      recipientName,
      recipientPhone,
      recipientAddress,
      vulnerabilityTypes,
      severityLevel,
      memberCount,
      assignedStaffId,
      assignedStaffName,
    } = req.body;

    let targetHousehold = null;
    let activeEvent = null;
    let finalEventId = eventId || null;
    let finalEventTitle = eventTitle || '';

    if (req.user.role === 'resident') {
      targetHousehold = await Household.findOne({ headOfHouseholdUserId: req.user._id });
      if (!targetHousehold) {
        return res.status(404).json({ message: 'Household record not found.' });
      }

      const residentBrgy = targetHousehold.barangayCode || req.user.barangayCode || '291';

      // Verify that there is an active distribution event for the resident's barangay
      if (eventId) {
        activeEvent = await DistributionEvent.findOne({
          _id: eventId,
          barangayCode: residentBrgy,
          $or: [{ isActive: true }, { status: { $in: ['Ongoing', 'Scheduled'] } }],
        });
      } else {
        activeEvent = await DistributionEvent.findOne({
          barangayCode: residentBrgy,
          $or: [{ isActive: true }, { status: { $in: ['Ongoing', 'Scheduled'] } }],
        }).sort({ openedAt: -1, createdAt: -1 });
      }

      if (!activeEvent) {
        return res.status(400).json({
          message: `Walang aktibong relief distribution event sa Barangay ${residentBrgy}. Ang Door-to-Door Special Relief ay bukas lamang kapag may opisyal na pamamahagi sa inyong barangay.`,
        });
      }

      finalEventId = activeEvent._id;
      finalEventTitle = activeEvent.title;

      // Check for duplicate pending/approved request for this same event
      const existingReq = await AssistanceRequest.findOne({
        householdId: targetHousehold._id,
        eventId: activeEvent._id,
        status: { $in: ['pending', 'under_review', 'approved', 'released'] },
      });

      if (existingReq) {
        return res.status(400).json({
          message: `Kayo ay mayroon nang aktibong Door-to-Door Special Relief request para sa pamamahaging "${activeEvent.title}".`,
        });
      }
    } else {
      // Official / Admin submitted on behalf of household
      if (householdId) {
        targetHousehold = await Household.findById(householdId);
      } else if (barangay || req.user.barangayCode) {
        const brgyCode = barangay || req.user.barangayCode || '291';
        targetHousehold = await Household.findOne({ barangayCode: brgyCode });
      }
      if (eventId) {
        const ev = await DistributionEvent.findById(eventId);
        if (ev) {
          finalEventId = ev._id;
          finalEventTitle = ev.title;
        }
      }
    }

    let formattedPackages = [];
    if (Array.isArray(packages) && packages.length > 0) {
      formattedPackages = packages.map(p => typeof p === 'string' ? { id: p, name: p, quantity: 1 } : p);
    } else if (activeEvent?.itemType) {
      formattedPackages = [{ id: 'unified_relief', name: activeEvent.itemType, quantity: 1 }];
    }

    let requestedItem = itemType || items || activeEvent?.itemType;
    if (!requestedItem && formattedPackages.length > 0) {
      requestedItem = formattedPackages.map(p => p.name || p.id).join(', ');
    }
    if (!requestedItem) {
      requestedItem = 'Pangunahing Family Food & Disaster Relief Pack';
    }

    const requestNotes = reason || notes || '';

    // If created by LGU Admin, allow assigning staff immediately and auto-approve.
    // If created by Barangay Official, it stays pending awaiting LGU review and dispatch.
    const isLgu = ['lgu_admin', 'lgu_superadmin', 'lgu_super_admin'].includes(req.user.role);

    let finalStaffId = null;
    let finalStaffName = '';

    if (isLgu) {
      if (assignedStaffId && mongoose.Types.ObjectId.isValid(assignedStaffId)) {
        const foundUser = await User.findById(assignedStaffId);
        if (foundUser) {
          finalStaffId = foundUser._id;
          finalStaffName = assignedStaffName || foundUser.name;
        }
      }

      if (!finalStaffId && assignedStaffName) {
        const clean = assignedStaffName.replace(/Field Officer|Team Alpha|Team Bravo|Standby|\(|\)|\-/gi, '').trim();
        if (clean) {
          const matched = await User.findOne({
            role: 'field_staff',
            name: { $regex: clean, $options: 'i' },
          });
          if (matched) {
            finalStaffId = matched._id;
            finalStaffName = assignedStaffName || matched.name;
          }
        }
      }

      // Fallback: If still no field_staff user ID, pick any available field staff
      if (!finalStaffId) {
        const anyStaff = await User.findOne({ role: 'field_staff' });
        if (anyStaff) {
          finalStaffId = anyStaff._id;
          finalStaffName = assignedStaffName || `${anyStaff.name} (${anyStaff.teamName || 'Field Operations'})`;
        }
      }
    }

    const initialStatus = isLgu ? 'approved' : 'pending';

    const request = await AssistanceRequest.create({
      householdId: targetHousehold ? targetHousehold._id : null,
      eventId: finalEventId,
      eventTitle: finalEventTitle,
      recipientName: recipientName || (targetHousehold?.headOfHouseholdUserId?.name || resident || req.user.name || ''),
      recipientPhone: recipientPhone || '',
      recipientAddress: recipientAddress || (targetHousehold?.address || ''),
      barangayCode: barangay || targetHousehold?.barangayCode || req.user.barangayCode || '291',
      memberCount: memberCount || targetHousehold?.memberCount || 1,
      vulnerabilityTypes: Array.isArray(vulnerabilityTypes) ? vulnerabilityTypes : [],
      severityLevel: severityLevel || 'Standard Assistance',
      itemType: requestedItem,
      packages: formattedPackages,
      notes: requestNotes,
      status: initialStatus,
      assignedStaff: isLgu ? finalStaffId : null,
      assignedStaffName: isLgu ? (finalStaffName || (finalStaffId ? 'Assigned Field Staff' : 'Field Officer Juan Santos (Team Alpha)')) : '',
      decidedBy: isLgu ? req.user._id : null,
      decidedAt: isLgu ? new Date() : null,
      requestedBy: req.user.role === 'resident' ? req.user.name : `Official: ${req.user.name}`,
    });

    const io = req.app.get('io');
    if (io) {
      if (isLgu && finalStaffId) {
        io.to(`staff:${finalStaffId}`).emit('new_delivery_task', {
          requestId: request._id,
          itemType: request.itemType,
          assignedStaffName: request.assignedStaffName,
        });
        io.emit('assistance_request_assigned', {
          requestId: request._id,
          assignedStaff: finalStaffId,
        });
      }
      io.emit('new_assistance_request', {
        requestId: request._id,
        barangayCode: request.barangayCode,
        status: request.status,
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assistance request', error: error.message });
  }
});

// @route   GET /api/assistance-requests/my-requests
// @desc    Get all assistance requests submitted by the logged-in resident
router.get('/my-requests', protect, requireRole('resident', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
  try {
    let household = null;
    if (req.user.role === 'resident') {
      household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    } else {
      household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
      if (!household && req.user.barangayCode) {
        household = await Household.findOne({ barangayCode: req.user.barangayCode });
      }
    }

    if (!household) {
      return res.json([]);
    }

    const myRequests = await AssistanceRequest.find({ householdId: household._id })
      .populate('assignedStaff', 'name emailOrPhone teamName')
      .populate('deliveredBy', 'name emailOrPhone')
      .sort({ requestedAt: -1 });

    res.json(myRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching personal assistance requests', error: error.message });
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
// @desc    Get assistance requests - scoped to the barangay_official's own barangay,
//          city-wide for lgu_admin (same pattern as /households/pending)
router.get('/', protect, requireRole('barangay_official', 'lgu_admin', 'field_staff'), async (req, res) => {
  try {
    const isOfficialOrStaff = req.user.role === 'barangay_official' || req.user.role === 'field_staff';
    const targetBrgy = isOfficialOrStaff ? req.user.barangayCode : req.query.barangayCode;

    let query = {};
    if (targetBrgy) {
      const households = await Household.find({ barangayCode: targetBrgy }).select('_id');
      const householdIds = households.map(h => h._id);
      query = {
        $or: [
          { householdId: { $in: householdIds } },
          { barangayCode: targetBrgy },
        ],
      };
    }

    // Role guard for field staff: Only see tasks assigned to them or their team
    if (req.user.role === 'field_staff') {
      const staffConditions = [
        { assignedStaff: req.user._id },
      ];
      if (req.user.name) {
        staffConditions.push({ assignedStaffName: new RegExp(req.user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }
      if (req.user.teamName) {
        const cleanTeam = req.user.teamName.replace(/field\s*team\s*/i, '').trim();
        if (cleanTeam) {
          staffConditions.push({ assignedStaffName: new RegExp(cleanTeam, 'i') });
        }
      }
      if (query.$or) {
        query = { $and: [{ $or: query.$or }, { $or: staffConditions }] };
      } else {
        query.$or = staffConditions;
      }
    }

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
router.patch('/:id/assign', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { assignedStaffId, assignedStaffName } = req.body;
    const request = await AssistanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    let finalStaffId = null;
    let finalStaffName = assignedStaffName || '';

    // Check if a valid User ObjectId was provided
    if (assignedStaffId && mongoose.Types.ObjectId.isValid(assignedStaffId)) {
      const foundUser = await User.findById(assignedStaffId);
      if (foundUser) {
        finalStaffId = foundUser._id;
        if (!finalStaffName) finalStaffName = foundUser.name;
      }
    }

    // If no User matched by ID, try matching field_staff by name
    if (!finalStaffId && finalStaffName) {
      const clean = finalStaffName.replace(/Field Officer|Team Alpha|Team Bravo|Standby|\(|\)|\-/gi, '').trim();
      if (clean) {
        const matched = await User.findOne({
          role: 'field_staff',
          name: { $regex: clean, $options: 'i' },
        });
        if (matched) {
          finalStaffId = matched._id;
        }
      }
    }

    // Fallback: If still no field_staff user ID, grab any field_staff so socket room works
    if (!finalStaffId) {
      const anyStaff = await User.findOne({ role: 'field_staff' });
      if (anyStaff) finalStaffId = anyStaff._id;
    }

    request.assignedStaff = finalStaffId;
    request.assignedStaffName = finalStaffName || 'Field Officer Juan Santos (Team Alpha)';
    request.status = 'approved';
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    await request.save();

    const io = req.app.get('io');
    if (io && finalStaffId) {
      io.to(`staff:${finalStaffId}`).emit('new_delivery_task', {
        requestId: request._id,
        itemType: request.itemType,
        assignedStaffName: request.assignedStaffName,
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
