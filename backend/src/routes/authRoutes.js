const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Household = require('../models/Household');
const RecoveryStatus = require('../models/RecoveryStatus');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');
const { calculatePriorityIndex } = require('../utils/priorityIndex');

const OtpToken = require('../models/OtpToken');

// In-memory fallback cache for OTP codes
const otpStore = new Map();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const { sendSMS } = require('../services/smsService');
const { sendEmailOTP } = require('../services/emailService');

// @route   POST /api/auth/send-otp
// @desc    Send a 6-digit OTP code for registration or password reset
router.post('/send-otp', async (req, res) => {
  try {
    const rawTarget = req.body.phoneOrEmail || req.body.emailOrPhone || req.body.identifier || req.body.phone || req.body.email;
    if (!rawTarget) {
      return res.status(400).json({ message: 'Phone number or email is required.' });
    }

    const key = rawTarget.trim().toLowerCase();
    const isEmail = key.includes('@');

    // Generate secure 6-digit random OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in MongoDB (survives restarts & scales across servers)
    await OtpToken.deleteMany({ phoneOrEmail: key });
    await OtpToken.create({ phoneOrEmail: key, code });

    // Backup store in memory
    otpStore.set(key, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    let dispatchResult = null;
    if (isEmail) {
      // Send 100% Free Email OTP via Nodemailer / Gmail SMTP
      dispatchResult = await sendEmailOTP(key, code);
    } else {
      // Send SMS via Semaphore API service
      dispatchResult = await sendSMS(
        rawTarget.trim(),
        `[MitigatePlus Manila] Your verification OTP code is ${code}. Valid for 10 minutes. Do not share.`
      );
    }

    res.json({
      success: true,
      message: `OTP verification code sent to ${rawTarget}.`,
      dispatchResult,
      // For local/offline testing fallback
      debugOtp: process.env.NODE_ENV === 'development' ? code : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP code', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify 6-digit OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const rawTarget = req.body.phoneOrEmail || req.body.emailOrPhone || req.body.identifier || req.body.phone || req.body.email;
    const rawOtp = req.body.otpCode || req.body.otp || req.body.code;
    if (!rawTarget || !rawOtp) {
      return res.status(400).json({ message: 'Phone/email and OTP code are required.' });
    }

    const key = rawTarget.trim().toLowerCase();
    const otpString = String(rawOtp).trim();
    const dbRecord = await OtpToken.findOne({ phoneOrEmail: key, code: otpString });
    const memoryRecord = otpStore.get(key);

    const isValid = dbRecord || (memoryRecord && memoryRecord.code === otpString);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code. Please check and try again.' });
    }

    // Valid OTP - clean up token
    await OtpToken.deleteMany({ phoneOrEmail: key });
    otpStore.delete(key);

    res.json({
      verified: true,
      message: 'OTP verification successful!',
    });
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Self-service password recovery using OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { emailOrPhone, otpCode, newPassword } = req.body;
    if (!emailOrPhone || !otpCode || !newPassword) {
      return res.status(400).json({ message: 'Please provide email/phone, OTP code, and new password.' });
    }

    const key = emailOrPhone.trim().toLowerCase();
    const dbRecord = await OtpToken.findOne({ phoneOrEmail: key, code: otpCode.trim() });
    const memoryRecord = otpStore.get(key);

    const isValid = dbRecord || (memoryRecord && memoryRecord.code === otpCode.trim());

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code.' });
    }

    const user = await User.findOne({ emailOrPhone: key });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email or phone number.' });
    }

    user.passwordHash = newPassword;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await OtpToken.deleteMany({ phoneOrEmail: key });
    otpStore.delete(key);

    await AuditLog.create({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      notes: `Password successfully reset via OTP verification.`,
    });

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new Resident. Two paths:
//          - new_household: creates a new Household + QR code (default)
//          - join_existing: does NOT create a second Household/QR. Instead it requests a
//            headcount bump on the household already there, via memberCountPendingUpdate,
//            reviewed by the same barangay official queue. This is what actually prevents
//            a second claimable QR record from ever existing for the same family.
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      emailOrPhone,
      password,
      address,
      purok,
      barangayCode,
      members,
      damageLevel,
      registrationType,
      linkedHouseholdId,
      validIdType,
      validIdImage,
      validIdNumber,
    } = req.body;

    if (!name || !emailOrPhone || !password || !address || !purok || !barangayCode) {
      return res.status(400).json({ message: 'Please fill in all required registration fields.' });
    }

    const existingUser = await User.findOne({ emailOrPhone: emailOrPhone.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email or phone already exists.' });
    }

    // Check for existing address/purok overlap in the same barangay.
    // Overlap only FLAGS for review — it never auto-forces join_existing, since a
    // genuinely separate household (e.g. a second family renting in the same compound)
    // can legitimately share an address.
    const overlapHouseholds = await Household.find({
      barangayCode,
      address: { $regex: new RegExp(`^${address.trim()}$`, 'i') },
      purok: { $regex: new RegExp(`^${purok.trim()}$`, 'i') },
    });
    const hasOverlap = overlapHouseholds.length > 0;

    const user = await User.create({
      name,
      emailOrPhone: emailOrPhone.trim().toLowerCase(),
      passwordHash: password,
      role: 'resident',
      barangayCode,
    });

    const parsedMembers = Array.isArray(members) ? members : [];
    const io = req.app.get('io');
    const finalRegistrationType = registrationType || 'new_household';

    // ---- JOIN EXISTING HOUSEHOLD PATH ----
    if (finalRegistrationType === 'join_existing') {
      if (!linkedHouseholdId) {
        return res.status(400).json({ message: 'linkedHouseholdId is required when registrationType is join_existing.' });
      }

      const linkedHousehold = await Household.findOne({ _id: linkedHouseholdId, barangayCode });
      if (!linkedHousehold) {
        return res.status(404).json({ message: 'The household you are trying to join was not found in this barangay.' });
      }

      const additionalMembers = parsedMembers.length > 0 ? parsedMembers.length : 1;
      linkedHousehold.memberCountPendingUpdate = linkedHousehold.memberCount + additionalMembers;
      await linkedHousehold.save();

      await AuditLog.create({
        actorUserId: user._id,
        actorRole: 'resident',
        action: 'REQUEST_JOIN_HOUSEHOLD',
        targetType: 'Household',
        targetId: linkedHousehold._id.toString(),
        notes: `${name} requested to join household at ${linkedHousehold.address}, Purok ${linkedHousehold.purok}. Pending member count: ${linkedHousehold.memberCountPendingUpdate}.`,
      });

      if (io) {
        io.to(`barangay:${barangayCode}`).emit('household_update_pending', {
          householdId: linkedHousehold._id,
          address: linkedHousehold.address,
          purok: linkedHousehold.purok,
          barangayCode,
          pendingMemberCount: linkedHousehold.memberCountPendingUpdate,
        });
      }

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        emailOrPhone: user.emailOrPhone,
        role: user.role,
        barangayCode: user.barangayCode,
        message: 'Account created. Your request to join this household is pending barangay official review.',
        linkedHouseholdId: linkedHousehold._id,
        token: generateToken(user._id),
      });
    }

    // ---- NEW, SEPARATE HOUSEHOLD PATH ----
    const memberCount = parsedMembers.length > 0 ? parsedMembers.length : 1;
    const qrCode = `MNL-${barangayCode}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const newHousehold = new Household({
      headOfHouseholdUserId: user._id,
      address: address.trim(),
      purok: purok.trim(),
      barangayCode,
      memberCount,
      members: parsedMembers,
      qrCode,
      verificationStatus: 'pending',
      registrationType: 'new_household',
      linkedHouseholdId: hasOverlap ? overlapHouseholds[0]._id : null,
      validIdType: validIdType || 'Government ID',
      validIdImage: validIdImage || null,
      validIdNumber: validIdNumber || '',
      damageLevel: damageLevel || 'Minor',
    });

    const { priorityScore, priorityLevel } = calculatePriorityIndex(newHousehold);
    newHousehold.priorityScore = priorityScore;
    newHousehold.priorityLevel = priorityLevel;

    await newHousehold.save();

    await RecoveryStatus.create({
      householdId: newHousehold._id,
      status: 'waiting',
    });

    await AuditLog.create({
      actorUserId: user._id,
      actorRole: 'resident',
      action: 'SUBMIT_REGISTRATION',
      targetType: 'Household',
      targetId: newHousehold._id.toString(),
      notes: `Registered household at ${address}, Purok ${purok}, Barangay ${barangayCode}. Overlap detected: ${hasOverlap}`,
    });

    if (io) {
      io.to(`barangay:${barangayCode}`).emit('new_pending_registration', {
        householdId: newHousehold._id,
        address: newHousehold.address,
        purok: newHousehold.purok,
        barangayCode,
        hasOverlap,
        submittedAt: newHousehold.createdAt,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      emailOrPhone: user.emailOrPhone,
      role: user.role,
      barangayCode: user.barangayCode,
      household: newHousehold,
      hasAddressOverlap: hasOverlap,
      overlapCount: overlapHouseholds.length,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate User & get token (General / Web Admin / Resident / Staff)
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password, requiredRole } = req.body;
    if (!emailOrPhone || !password || typeof emailOrPhone !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Please enter both valid email/phone and password.' });
    }

    const user = await User.findOne({ emailOrPhone: emailOrPhone.trim().toLowerCase() });

    // Check if account is temporarily locked due to failed logins
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).`
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await user.save();
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset failed login counter on successful authentication
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    if (requiredRole && user.role !== requiredRole) {
      if (requiredRole === 'resident' && user.role !== 'resident') {
        return res.status(403).json({ message: 'Access denied: This portal is for Affected Residents only.' });
      }
      if (requiredRole === 'field_staff' && user.role !== 'field_staff') {
        return res.status(403).json({ message: 'Access denied: This portal is for authorized Field Staff only.' });
      }
    }

    let household = null;
    if (user.role === 'resident') {
      household = await Household.findOne({ headOfHouseholdUserId: user._id });
    }

    res.json({
      _id: user._id,
      name: user.name,
      emailOrPhone: user.emailOrPhone,
      role: user.role,
      barangayCode: user.barangayCode,
      household,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   POST /api/auth/provision-admin
// @desc    LGU SuperAdmin provisions an LGU Admin account
router.post('/provision-admin', protect, requireRole('lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { name, emailOrPhone, password } = req.body;
    if (!name || !emailOrPhone || !password) {
      return res.status(400).json({ message: 'Please provide name, email/phone, and password.' });
    }

    const existing = await User.findOne({ emailOrPhone: emailOrPhone.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email/phone already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const adminUser = await User.create({
      name: name.trim(),
      emailOrPhone: emailOrPhone.trim().toLowerCase(),
      passwordHash,
      role: 'lgu_admin',
      barangayCode: null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'LGU Admin account provisioned successfully.',
      user: {
        _id: adminUser._id,
        name: adminUser.name,
        emailOrPhone: adminUser.emailOrPhone,
        role: adminUser.role,
        barangayCode: 'City-Wide',
        createdAt: adminUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error provisioning LGU Admin account', error: error.message });
  }
});

// @route   POST /api/auth/provision-official
// @desc    LGU Admin or SuperAdmin provisions a Barangay Official account
router.post('/provision-official', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { name, emailOrPhone, password, barangayCode } = req.body;
    if (!name || !emailOrPhone || !password || !barangayCode) {
      return res.status(400).json({ message: 'Please provide name, email/phone, password, and barangayCode.' });
    }

    const existing = await User.findOne({ emailOrPhone: emailOrPhone.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email/phone already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const official = await User.create({
      name,
      emailOrPhone: emailOrPhone.trim().toLowerCase(),
      passwordHash,
      role: 'barangay_official',
      barangayCode,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: `Barangay Official account created for Barangay ${barangayCode}`,
      user: official,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error provisioning official account', error: error.message });
  }
});

// @route   POST /api/auth/provision-staff
// @desc    LGU Admin or SuperAdmin provisions a Field Staff account
router.post('/provision-staff', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { name, emailOrPhone, password, barangayCode } = req.body;
    if (!name || !emailOrPhone || !password || !barangayCode) {
      return res.status(400).json({ message: 'Please provide name, email/phone, password, and barangayCode.' });
    }

    const existing = await User.findOne({ emailOrPhone: emailOrPhone.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email/phone already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name,
      emailOrPhone: emailOrPhone.trim().toLowerCase(),
      passwordHash,
      role: 'field_staff',
      barangayCode,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: `Field Staff account created for Barangay ${barangayCode}`,
      user: staff,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error provisioning field staff account', error: error.message });
  }
});

// @route   GET /api/auth/provisioned-users
// @desc    Get all provisioned LGU Admin, Barangay Official, and Field Staff accounts
router.get('/provisioned-users', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['lgu_admin', 'barangay_official', 'field_staff', 'lgu_superadmin', 'lgu_super_admin'] }
    }).select('-passwordHash').sort({ createdAt: -1 }).lean();

    res.json(users.map(u => ({
      id: u._id,
      _id: u._id,
      name: u.name,
      emailOrPhone: u.emailOrPhone,
      role: u.role,
      barangayCode: u.barangayCode || 'City-Wide',
      status: u.status || 'active',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-08-01',
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch provisioned users', error: error.message });
  }
});

// @route   POST /api/auth/register-fcm-token
// @desc    Register or update user's FCM Push Notification Token
router.post('/register-fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken is required.' });
    }

    req.user.fcmToken = fcmToken;
    await req.user.save();

    res.json({ success: true, message: 'FCM push token registered successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering FCM token', error: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update current user's profile info (name, emailOrPhone, avatarUrl, password)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, emailOrPhone, avatarUrl, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    if (name) user.name = name.trim();
    if (emailOrPhone) user.emailOrPhone = emailOrPhone.trim().toLowerCase();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password provided is incorrect.' });
      }
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.passwordChangedAt = new Date();
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        name: user.name,
        emailOrPhone: user.emailOrPhone,
        role: user.role,
        barangayCode: user.barangayCode,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// PUT /api/auth/change-password - Change password (authenticated)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    const user = await User.findById(req.user._id);
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.passwordChangedAt = new Date(Date.now() + 1000);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'CHANGE_PASSWORD', targetType: 'User', targetId: req.user._id });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
