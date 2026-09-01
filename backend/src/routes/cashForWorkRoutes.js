const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const CashForWorkProject = require('../models/CashForWorkProject');
const CashForWorkApplication = require('../models/CashForWorkApplication');
const Household = require('../models/Household');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// Helper: Log audit action
async function recordAudit(actorUser, action, description, targetType, targetId, ip) {
  try {
    await AuditLog.create({
      actorUserId: actorUser?._id,
      actorName: actorUser?.name || 'System',
      actorRole: actorUser?.role || 'system',
      action,
      description,
      targetType,
      targetId: String(targetId),
      ipAddress: ip || '127.0.0.1',
    });
  } catch (err) {
    console.warn('AuditLog write warning:', err.message);
  }
}

// -------------------------------------------------------------
// 1. BARANGAY & LGU: Propose / Create a Cash-for-Work Project
// -------------------------------------------------------------
const handleCreateOrRequestProject = async (req, res) => {
  try {
    const { title, description, targetWorksite, totalSlots, durationDays, dailyWageRate, availableCategories } = req.body;
    const barangayCode = req.body.barangayCode || req.user.barangayCode || '291';

    if (!title || !description || !targetWorksite) {
      return res.status(400).json({ message: 'Title, description, and target worksite are required.' });
    }

    const slots = Number(totalSlots) || 25;
    const days = Number(durationDays) || 10;
    const wage = Number(dailyWageRate) || 500;
    const budget = slots * days * wage;

    const isLgu = req.user.role === 'lgu_superadmin' || req.user.role === 'lgu_admin';
    const project = await CashForWorkProject.create({
      title,
      description,
      barangayCode,
      targetWorksite,
      proposedByUserId: req.user._id,
      approvedByAdminId: isLgu ? req.user._id : null,
      totalSlots: slots,
      durationDays: days,
      dailyWageRate: wage,
      allocatedBudget: budget,
      availableCategories: availableCategories || [
        'Debris & Mud Clearing',
        'Drainage & Canal Declogging',
        'Evacuation Center Sanitation',
        'Relief Goods Logistics & Packing',
        'Carpentry & Facility Repair',
      ],
      status: isLgu ? 'approved_active' : 'pending_lgu_approval',
    });

    await recordAudit(
      req.user,
      isLgu ? 'CFW_PROJECT_CREATED' : 'CFW_PROJECT_REQUEST',
      isLgu
        ? `LGU Admin created active Cash-for-Work Project: ${title} for Brgy ${barangayCode} (Budget: ₱${budget.toLocaleString()})`
        : `Barangay ${barangayCode} proposed Cash-for-Work Project: ${title} (Budget: ₱${budget.toLocaleString()})`,
      'CashForWorkProject',
      project._id,
      req.ip
    );

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      if (!isLgu) {
        io.to('admin_room').emit('cfw_project_proposed', {
          projectId: project._id,
          title: project.title,
          barangayCode: project.barangayCode,
          budget: project.allocatedBudget,
        });
      } else {
        io.to(`barangay:${barangayCode}`).emit('cfw_project_status_updated', {
          projectId: project._id,
          status: project.status,
        });
      }
    }

    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error('Create CFW Project error:', error);
    res.status(500).json({ message: 'Error proposing project', error: error.message });
  }
};

router.post('/projects/request', protect, requireRole(['barangay_official', 'lgu_admin', 'lgu_superadmin']), handleCreateOrRequestProject);
router.post('/projects', protect, requireRole(['barangay_official', 'lgu_admin', 'lgu_superadmin']), handleCreateOrRequestProject);



// -------------------------------------------------------------
// 2. LGU ADMIN: Approve / Reject Cash-for-Work Project & Allocate Budget
// -------------------------------------------------------------
router.patch('/projects/:id/review', protect, requireRole(['lgu_admin', 'lgu_superadmin']), async (req, res) => {
  try {
    const { status, rejectionReason, startDate, endDate } = req.body;
    const project = await CashForWorkProject.findById(req.params.id);

    if (!project) {
      return res.status(400).json({ message: 'Project not found' });
    }

    if (status === 'approved_active') {
      project.status = 'approved_active';
      project.approvedByAdminId = req.user._id;
      project.startDate = startDate || new Date();
      const end = new Date(project.startDate);
      end.setDate(end.getDate() + project.durationDays);
      project.endDate = endDate || end;
    } else if (status === 'rejected') {
      project.status = 'rejected';
      project.rejectionReason = rejectionReason || 'Budget capacity reached or non-qualifying scope.';
    }

    await project.save();

    await recordAudit(
      req.user,
      'CFW_PROJECT_REVIEW',
      `LGU Admin marked project ${project.title} as ${project.status}`,
      'CashForWorkProject',
      project._id,
      req.ip
    );

    // Notify Barangay room
    const io = req.app.get('io');
    if (io) {
      io.to(`barangay:${project.barangayCode}`).emit('cfw_project_status_updated', {
        projectId: project._id,
        status: project.status,
      });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Review CFW Project error:', error);
    res.status(500).json({ message: 'Error reviewing project', error: error.message });
  }
});

// -------------------------------------------------------------
// 3. ALL / RESIDENT: Get List of Projects (Available in Barangay or All)
// -------------------------------------------------------------
router.get('/projects', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.barangayCode && req.query.barangayCode !== 'ALL') {
      filter.barangayCode = req.query.barangayCode;
    } else if (req.user.role === 'resident' || req.user.role === 'barangay_official') {
      filter.barangayCode = req.user.barangayCode || '291';
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const projects = await CashForWorkProject.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get CFW Projects error:', error);
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
});

// -------------------------------------------------------------
// 4. RESIDENT: Apply for a Cash-for-Work Project Slot
// -------------------------------------------------------------
router.post('/apply', protect, async (req, res) => {
  try {
    const { projectId, selectedCategory, experienceNotes } = req.body;

    if (!selectedCategory) {
      return res.status(400).json({ message: 'Selected job category is required.' });
    }

    const brgyCode = req.user.barangayCode || '291';
    let project = null;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      project = await CashForWorkProject.findById(projectId);
    }

    if (!project) {
      project = await CashForWorkProject.findOne({
        barangayCode: brgyCode,
        status: 'approved_active',
      });
    }

    if (!project) {
      // Auto-provision approved project for this barangay so citizen can immediately apply
      project = await CashForWorkProject.create({
        title: 'Post-Disaster Community Clearing & Rehabilitation Drive',
        description: '10-day emergency employment initiative funded by Manila City Disaster Mitigation Fund.',
        barangayCode: brgyCode,
        targetWorksite: `Barangay ${brgyCode} (Zone 27 Worksites)`,
        totalSlots: 35,
        durationDays: 10,
        dailyWageRate: 500,
        allocatedBudget: 175000,
        status: 'approved_active',
        availableCategories: [
          'Debris & Mud Clearing',
          'Drainage & Canal Declogging',
          'Evacuation Center Sanitation',
          'Relief Goods Logistics & Packing',
          'Carpentry & Facility Repair',
        ],
      });
    }

    // Find resident household
    let household = await Household.findOne({
      $or: [
        { headOfHouseholdUserId: req.user._id },
        { contactNumber: req.user.phone },
        { barangayCode: brgyCode, headName: req.user.name },
      ],
    });

    if (!household) {
      // Auto-fallback household record if registered via mobile user
      household = await Household.create({
        headName: req.user.name || 'Resident',
        headOfHouseholdUserId: req.user._id,
        barangayCode: brgyCode,
        address: req.user.address || `Barangay ${brgyCode}, Manila`,
        contactNumber: req.user.phone || '09000000000',
        members: [{ name: req.user.name || 'Resident', age: 30, relationship: 'Head', condition: 'none' }],
        verificationStatus: 'verified',
        qrCode: `HH-${brgyCode}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      });
    }

    // Check if already applied
    const existing = await CashForWorkApplication.findOne({
      projectId: project._id,
      $or: [
        { householdId: household._id },
        { applicantUserId: req.user._id },
      ],
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        application: existing,
        message: 'Existing application retrieved.',
      });
    }

    // Generate unique Voucher Code
    const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const voucherCode = `CFW-${project.barangayCode}-${randomCode}`;

    const application = await CashForWorkApplication.create({
      projectId: project._id,
      householdId: household._id,
      applicantUserId: req.user._id,
      applicantName: req.user.name,
      applicantPhone: req.user.phone || household.contactNumber || '09000000000',
      barangayCode: project.barangayCode,
      selectedCategory,
      experienceNotes: experienceNotes || '',
      dailyWageRate: project.dailyWageRate || 500,
      payoutVoucherCode: voucherCode,
      status: 'pending_barangay_review',
    });

    await recordAudit(
      req.user,
      'CFW_APPLICATION_SUBMITTED',
      `Resident ${req.user.name} applied for ${project.title} (${selectedCategory})`,
      'CashForWorkApplication',
      application._id,
      req.ip
    );

    res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('CFW Apply error:', error);
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
});

// -------------------------------------------------------------
// 5. RESIDENT: Get My Household Applications & Attendance Stepper
// -------------------------------------------------------------
router.get('/my-applications', protect, async (req, res) => {
  try {
    const household = await Household.findOne({ headOfHouseholdUserId: req.user._id });
    const filter = household ? { householdId: household._id } : { applicantUserId: req.user._id };

    const applications = await CashForWorkApplication.find(filter)
      .populate('projectId')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
});

// -------------------------------------------------------------
// 6. BARANGAY: Review & Approve/Reject Applicant Slot
// -------------------------------------------------------------
router.patch('/applications/:id/review', protect, requireRole(['barangay_official', 'lgu_admin', 'lgu_superadmin']), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body; // 'approved_for_work' or 'rejected'
    const application = await CashForWorkApplication.findById(req.params.id).populate('projectId');

    if (!application) {
      return res.status(400).json({ message: 'Application not found' });
    }

    application.status = status;
    application.reviewNotes = reviewNotes || '';
    application.reviewedByUserId = req.user._id;
    application.reviewedAt = new Date();

    if (status === 'approved_for_work') {
      // Increment filled slots
      await CashForWorkProject.findByIdAndUpdate(application.projectId._id, {
        $inc: { filledSlots: 1 },
      });
    }

    await application.save();

    await recordAudit(
      req.user,
      'CFW_APPLICATION_REVIEWED',
      `Barangay marked application of ${application.applicantName} as ${status}`,
      'CashForWorkApplication',
      application._id,
      req.ip
    );

    // Notify household room
    const io = req.app.get('io');
    if (io) {
      io.to(`household:${application.householdId}`).emit('cfw_application_status', {
        applicationId: application._id,
        status: application.status,
      });
    }

    res.json({ success: true, application });
  } catch (error) {
    console.error('Review applicant error:', error);
    res.status(500).json({ message: 'Error reviewing application', error: error.message });
  }
});

// -------------------------------------------------------------
// 7. FIELD STAFF / LGU: Scan Worker QR Code for Daily Attendance (Time-In / Time-Out)
// -------------------------------------------------------------
router.post('/attendance/scan', protect, requireRole(['field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin']), async (req, res) => {
  try {
    const { qrCode, householdId, projectId } = req.body;

    let application = null;
    if (householdId && projectId) {
      application = await CashForWorkApplication.findOne({ householdId, projectId, status: 'approved_for_work' }).populate('projectId');
    } else if (qrCode) {
      // Find household by qrCode
      const hh = await Household.findOne({ qrCode });
      if (hh) {
        application = await CashForWorkApplication.findOne({ householdId: hh._id, status: 'approved_for_work' }).populate('projectId');
      }
    }

    if (!application) {
      return res.status(400).json({ message: 'No approved Cash-for-Work assignment found for this QR pass.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let record = application.attendanceLogs.find((log) => log.date === todayStr);

    let actionType = 'TIME_IN';
    if (!record) {
      // Time-In
      const newDayNum = application.attendanceLogs.length + 1;
      record = {
        dayNumber: newDayNum,
        date: todayStr,
        timeIn: new Date(),
        timeOut: null,
        scannedByStaffId: req.user._id,
        staffName: req.user.name,
        isCompleted: false,
      };
      application.attendanceLogs.push(record);
      actionType = 'TIME_IN';
    } else if (!record.timeOut) {
      // Time-Out (Complete day)
      record.timeOut = new Date();
      record.isCompleted = true;
      application.totalDaysWorked += 1;
      application.totalPayoutEarned = application.totalDaysWorked * application.dailyWageRate;
      actionType = 'TIME_OUT';
    } else {
      return res.status(400).json({
        message: `Attendance already completed for today (${todayStr}). Total Days Worked: ${application.totalDaysWorked}/${application.projectId.durationDays}`,
        application,
      });
    }

    await application.save();

    await recordAudit(
      req.user,
      'CFW_ATTENDANCE_SCAN',
      `LGU Staff ${req.user.name} recorded ${actionType} for worker ${application.applicantName} (Day ${record.dayNumber})`,
      'CashForWorkApplication',
      application._id,
      req.ip
    );

    res.json({
      success: true,
      actionType,
      applicantName: application.applicantName,
      dayNumber: record.dayNumber,
      totalDaysWorked: application.totalDaysWorked,
      durationDays: application.projectId.durationDays,
      totalPayoutEarned: application.totalPayoutEarned,
      dailyWageRate: application.dailyWageRate,
      application,
    });
  } catch (error) {
    console.error('Attendance scan error:', error);
    res.status(500).json({ message: 'Error recording attendance', error: error.message });
  }
});

// -------------------------------------------------------------
// 8. LGU ADMIN: Live Payroll Summary & Certified Disbursement
// -------------------------------------------------------------
router.get('/payroll/:projectId', protect, requireRole(['lgu_admin', 'lgu_superadmin', 'barangay_official']), async (req, res) => {
  try {
    const project = await CashForWorkProject.findById(req.params.projectId);
    if (!project) {
      return res.status(400).json({ message: 'Project not found' });
    }

    const workers = await CashForWorkApplication.find({
      projectId: project._id,
      status: 'approved_for_work',
    }).populate('householdId');

    const totalDisbursementEarned = workers.reduce((sum, w) => sum + (w.totalPayoutEarned || 0), 0);

    res.json({
      success: true,
      project,
      totalWorkers: workers.length,
      totalDisbursementEarned,
      allocatedBudget: project.allocatedBudget,
      remainingBudget: project.allocatedBudget - totalDisbursementEarned,
      workers,
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: 'Error fetching payroll', error: error.message });
  }
});

module.exports = router;
