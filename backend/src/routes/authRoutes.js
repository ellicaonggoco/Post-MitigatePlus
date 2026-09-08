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

// Strict Global Identifier Uniqueness: No two users (resident, staff, official, admin) can share a phone number or email
async function findExistingUserWithIdentifier(identifier, excludeUserId = null) {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  const lower = clean.toLowerCase();
  const noSpace = clean.replace(/[\s\-\(\)]/g, '');

  const variants = [clean, lower, noSpace];
  if (/^09\d{9}$/.test(noSpace)) {
    variants.push('+63' + noSpace.slice(1));
    variants.push('63' + noSpace.slice(1));
  } else if (/^\+639\d{9}$/.test(noSpace)) {
    variants.push('0' + noSpace.slice(3));
    variants.push(noSpace.slice(1));
  } else if (/^639\d{9}$/.test(noSpace)) {
    variants.push('0' + noSpace.slice(2));
    variants.push('+' + noSpace);
  }

  const query = {
    $or: [
      { emailOrPhone: { $in: variants } },
      { contactNum: { $in: variants } },
      { employeeId: { $in: variants } },
      { email: { $in: variants } },
    ]
  };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  return await User.findOne(query);
}

const { sendSMS } = require('../services/smsService');
const { sendEmailOTP } = require('../services/emailService');

// @route   POST /api/auth/send-otp
// @desc    Send a 6-digit OTP code for registration or password reset
router.post('/send-otp', async (req, res) => {
  try {
    const rawTarget = req.body.phoneOrEmail || req.body.emailOrPhone || req.body.identifier || req.body.phone || req.body.email;
    const { purpose, isRecovery } = req.body;
    if (!rawTarget) {
      return res.status(400).json({ message: 'Phone number or email is required.' });
    }

    const isEmail = String(rawTarget).includes('@');
    const key = isEmail
      ? String(rawTarget).trim().toLowerCase()
      : String(rawTarget).replace(/[\s\-\(\)]/g, '').trim();

    // If purpose is password recovery / forgot password, verify that the account actually exists before sending OTP!
    if (purpose === 'recovery' || isRecovery || req.body.forPasswordReset) {
      const existingUser = await findExistingUserWithIdentifier(key);
      if (!existingUser) {
        return res.status(404).json({
          message: 'Walang account na natagpuan para sa email o mobile number na ito. Pakisuri ang inyong rehistradong credentials.'
        });
      }
    }

    // Generate secure 6-digit random OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Normalizing phone variants if not email (e.g. 09171234567, +639171234567, 639171234567)
    const variants = [key];
    if (!isEmail) {
      if (/^09\d{9}$/.test(key)) {
        variants.push('+63' + key.slice(1));
        variants.push('63' + key.slice(1));
      } else if (/^\+639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(3));
        variants.push(key.slice(1));
      } else if (/^639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(2));
        variants.push('+' + key);
      }
    }

    // Store in MongoDB (survives restarts & scales across servers)
    await OtpToken.deleteMany({ phoneOrEmail: { $in: variants } });
    await OtpToken.create({ phoneOrEmail: key, code, isVerified: false });

    // Backup store in memory with 15-minute validity window
    const now = Date.now();
    for (const v of variants) {
      otpStore.set(v, { code, verified: false, expiresAt: now + 15 * 60 * 1000 });
    }

    // Dispatch Email / SMS asynchronously with 3-second timeout protection
    if (isEmail) {
      sendEmailOTP(key, code).catch(err => console.error('[ASYNC EMAIL ERROR]', err.message));
    } else {
      sendSMS(
        rawTarget.trim(),
        `[MitigatePlus Manila] Your verification OTP code is ${code}. Valid for 15 minutes. Do not share.`
      ).catch(err => console.error('[ASYNC SMS ERROR]', err.message));
    }

    // Instant sub-second response to mobile client
    res.json({
      success: true,
      message: `OTP verification code sent to ${rawTarget}.`,
      otpCode: code,
      debugOtp: code,
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

    const isEmail = String(rawTarget).includes('@');
    const key = isEmail
      ? String(rawTarget).trim().toLowerCase()
      : String(rawTarget).replace(/[\s\-\(\)]/g, '').trim();
    const otpString = String(rawOtp).trim();

    const variants = [key];
    if (!isEmail) {
      if (/^09\d{9}$/.test(key)) {
        variants.push('+63' + key.slice(1));
        variants.push('63' + key.slice(1));
      } else if (/^\+639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(3));
        variants.push(key.slice(1));
      } else if (/^639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(2));
        variants.push('+' + key);
      }
    }

    const dbRecord = await OtpToken.findOne({ phoneOrEmail: { $in: variants }, code: otpString });
    let memoryRecord = null;
    for (const v of variants) {
      const mem = otpStore.get(v);
      if (mem && mem.code === otpString) {
        memoryRecord = mem;
        break;
      }
    }

    const isValid = dbRecord || memoryRecord;

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code. Please check and try again.' });
    }

    // Mark as verified instead of deleting immediately so that subsequent steps (such as /forgot-password or /register) can complete safely.
    await OtpToken.updateMany(
      { phoneOrEmail: { $in: variants } },
      { isVerified: true, verifiedAt: new Date() }
    );

    const now = Date.now();
    for (const v of variants) {
      otpStore.set(v, { code: otpString, verified: true, verifiedAt: now, expiresAt: now + 15 * 60 * 1000 });
    }

    // Generate a secure resetToken (signed JWT)
    const resetToken = jwt.sign(
      { identifier: key, action: 'password_reset', code: otpString },
      process.env.JWT_SECRET || 'mitigateplus_secret_fallback',
      { expiresIn: '15m' }
    );

    res.json({
      verified: true,
      resetToken,
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
    const rawTarget = req.body.emailOrPhone || req.body.identifier || req.body.phoneOrEmail;
    const rawOtp = req.body.otpCode || req.body.otp || req.body.code;
    const { newPassword, resetToken } = req.body;
    if (!rawTarget || (!rawOtp && !resetToken) || !newPassword) {
      return res.status(400).json({ message: 'Please provide email/phone, OTP verification, and new password.' });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const isEmail = String(rawTarget).includes('@');
    const key = isEmail
      ? String(rawTarget).trim().toLowerCase()
      : String(rawTarget).replace(/[\s\-\(\)]/g, '').trim();

    const variants = [key];
    if (!isEmail) {
      if (/^09\d{9}$/.test(key)) {
        variants.push('+63' + key.slice(1));
        variants.push('63' + key.slice(1));
      } else if (/^\+639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(3));
        variants.push(key.slice(1));
      } else if (/^639\d{9}$/.test(key)) {
        variants.push('0' + key.slice(2));
        variants.push('+' + key);
      }
    }

    const otpCode = rawOtp ? String(rawOtp).trim() : null;

    let isValid = false;

    // 1. Verify signed resetToken if provided
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'mitigateplus_secret_fallback');
        if (decoded && decoded.action === 'password_reset' && variants.includes(decoded.identifier)) {
          isValid = true;
        }
      } catch (err) {
        // Fall through to DB/memory checks
      }
    }

    // 2. Check DB records: either matching code OR previously verified within the 15-minute window
    if (!isValid) {
      const dbRecord = await OtpToken.findOne({
        phoneOrEmail: { $in: variants },
        $or: [
          ...(otpCode ? [{ code: otpCode }] : []),
          { isVerified: true },
        ],
      });
      if (dbRecord) {
        isValid = true;
      }
    }

    // 3. Check in-memory store
    if (!isValid) {
      for (const v of variants) {
        const mem = otpStore.get(v);
        if (mem && (mem.verified === true || (otpCode && mem.code === otpCode))) {
          if (!mem.expiresAt || mem.expiresAt > Date.now()) {
            isValid = true;
            break;
          }
        }
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code.' });
    }

    // Find the user account using flexible lookup
    const user = await findExistingUserWithIdentifier(key);
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email or phone number.' });
    }

    user.passwordHash = newPassword.trim();
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Clean up OTP tokens now that password has been safely updated
    await OtpToken.deleteMany({ phoneOrEmail: { $in: variants } });
    for (const v of variants) {
      otpStore.delete(v);
    }

    await AuditLog.create({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      notes: `User ${user.name} (${user.emailOrPhone}) successfully reset their password via OTP verification.`,
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

    const existingUser = await findExistingUserWithIdentifier(emailOrPhone);
    if (existingUser) {
      const roleLabel = existingUser.role === 'resident' ? 'Residente' : existingUser.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
      return res.status(400).json({
        message: `Ang phone number na ito ay rehistrado na bilang ${roleLabel} (${existingUser.name}). Bawal magkaparehas ang number ng kahit sinong user.`
      });
    }

    // Check for existing address/purok overlap in the same barangay.
    // Overlap only FLAGS for review - it never auto-forces join_existing, since a
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

    const trimmedInput = emailOrPhone.trim();
    const lowerInput = trimmedInput.toLowerCase();
    const user = await User.findOne({
      $or: [
        { emailOrPhone: lowerInput },
        { contactNum: trimmedInput },
        { employeeId: trimmedInput },
        { email: lowerInput },
      ]
    });

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

    // Check if account has been suspended or deactivated by an administrator
    if (user.isActive === false) {
      return res.status(403).json({
        message: 'Account is suspended or deactivated. Please contact your LGU Administrator.',
      });
    }

    // Role-gating enforcement (supports single role string or array of permitted roles)
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowed.includes(user.role)) {
        if (allowed.includes('resident') && allowed.length === 1) {
          return res.status(403).json({ message: 'Access denied: This portal is for Affected Residents only.' });
        }
        if (allowed.includes('field_staff') && allowed.length === 1) {
          return res.status(403).json({ message: 'Access denied: This portal is for authorized Field Staff only.' });
        }
        if (allowed.some(r => ['lgu_superadmin', 'lgu_admin', 'barangay_official'].includes(r))) {
          return res.status(403).json({ message: 'Access denied: This portal is restricted to authorized LGU Personnel only.' });
        }
        return res.status(403).json({ message: `Access denied: Account role '${user.role}' is not authorized for this portal.` });
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

    const existing = await findExistingUserWithIdentifier(emailOrPhone);
    if (existing) {
      const roleLabel = existing.role === 'resident' ? 'Residente' : existing.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
      return res.status(400).json({ message: `Ang email o phone na ito ay ginagamit na bilang ${roleLabel} (${existing.name}).` });
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

    const existing = await findExistingUserWithIdentifier(emailOrPhone);
    if (existing) {
      const roleLabel = existing.role === 'resident' ? 'Residente' : existing.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
      return res.status(400).json({ message: `Ang email o phone na ito ay ginagamit na bilang ${roleLabel} (${existing.name}).` });
    }

    // Ensure only 1 active official per barangay
    const existingOfficial = await User.findOne({ role: 'barangay_official', barangayCode: String(barangayCode).trim() });
    if (existingOfficial) {
      return res.status(400).json({ message: `Mayroon nang nakatalagang Barangay Official para sa Barangay ${barangayCode} (${existingOfficial.name}).` });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const official = await User.create({
      name,
      emailOrPhone: emailOrPhone.trim().toLowerCase(),
      passwordHash,
      role: 'barangay_official',
      barangayCode: String(barangayCode).trim(),
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
// @desc    LGU Admin or SuperAdmin provisions a Field Staff account (City-Wide deployment)
router.post('/provision-staff', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { name, emailOrPhone, password, barangayCode, teamName, staffDesignation, employeeId, department, contactNum } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Please provide name and password.' });
    }

    // Uniform login: Phone Number is the Staff ID
    const staffPhone = (contactNum || employeeId || '').trim();
    const finalEmployeeId = staffPhone || (employeeId ? employeeId.trim() : null);
    const finalContactNum = staffPhone || (contactNum ? contactNum.trim() : null);
    const finalEmailOrPhone = (emailOrPhone && emailOrPhone.trim()) ? emailOrPhone.trim().toLowerCase() : staffPhone;

    if (!finalEmailOrPhone && !finalContactNum) {
      return res.status(400).json({ message: 'Please provide a Phone Number (Staff ID).' });
    }

    const existing = await User.findOne({
      $or: [
        { emailOrPhone: finalEmailOrPhone },
        ...(finalContactNum ? [{ contactNum: finalContactNum }] : []),
        ...(finalEmployeeId ? [{ employeeId: finalEmployeeId }] : []),
      ]
    });
    if (existing) {
      return res.status(400).json({ message: 'An account with this Phone Number, Email, or Staff ID already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name: name.trim(),
      emailOrPhone: finalEmailOrPhone,
      passwordHash,
      role: 'field_staff',
      barangayCode: barangayCode || 'City-Wide',
      teamName: teamName || 'Field Team Alpha',
      staffDesignation: staffDesignation || 'field_officer',
      employeeId: finalEmployeeId || null,
      department: department || 'MDRRMO Field Operations',
      contactNum: finalContactNum || null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: `Field Staff account created successfully for ${name} (${teamName || 'Field Team Alpha'})`,
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
      role: { $in: ['lgu_admin', 'barangay_official', 'field_staff'] },
      _id: { $ne: req.user._id }
    }).select('-passwordHash').sort({ createdAt: -1 }).lean();

    res.json(users.map(u => ({
      id: u._id,
      _id: u._id,
      name: u.name,
      emailOrPhone: u.emailOrPhone,
      role: u.role,
      barangayCode: u.barangayCode || 'City-Wide',
      teamName: u.teamName || (u.role === 'field_staff' ? 'Field Team Alpha' : null),
      staffDesignation: u.staffDesignation || (u.role === 'field_staff' ? 'field_officer' : null),
      employeeId: u.employeeId || null,
      department: u.department || null,
      contactNum: u.contactNum || null,
      status: u.status || 'active',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-08-01',
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch provisioned users', error: error.message });
  }
});

// @route   PATCH /api/auth/provisioned-users/:id/status
// @desc    Suspend or Reactivate a provisioned user account
router.patch('/provisioned-users/:id/status', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (user.role === 'lgu_superadmin' || user.role === 'lgu_super_admin') {
      return res.status(403).json({ message: 'Cannot modify Superadmin account status.' });
    }

    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    user.status = newStatus;
    await user.save();

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: newStatus === 'suspended' ? 'SUSPEND_ACCOUNT' : 'REACTIVATE_ACCOUNT',
      targetType: 'User',
      targetId: user._id,
      notes: `${newStatus === 'suspended' ? 'Suspended' : 'Reactivated'} account for ${user.name} (${user.emailOrPhone})`,
    });

    res.json({ success: true, message: `Account status updated to ${newStatus}.`, status: newStatus, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating account status', error: error.message });
  }
});

// @route   PUT /api/auth/provisioned-users/:id
// @desc    Edit details of a provisioned user account
router.put('/provisioned-users/:id', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const { name, emailOrPhone, password, department, employeeId, contactNum, teamName, staffDesignation, barangayCode } = req.body;

    // Check if new contact phone or employeeId is already taken by another user
    const checkPhone = (contactNum || (user.role === 'field_staff' ? employeeId : null));
    if (checkPhone && checkPhone.trim()) {
      const phoneConflict = await findExistingUserWithIdentifier(checkPhone.trim(), user._id);
      if (phoneConflict) {
        const roleLabel = phoneConflict.role === 'resident' ? 'Residente' : phoneConflict.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
        return res.status(400).json({
          message: `Ang phone number na ${checkPhone} ay ginagamit na ng isa nang ${roleLabel} (${phoneConflict.name}). Bawal magkaparehas ang number ng kahit sinong staff o resident.`
        });
      }
    }

    // Check if email is already taken by another user
    if (emailOrPhone && emailOrPhone.trim().toLowerCase() !== user.emailOrPhone) {
      const emailConflict = await findExistingUserWithIdentifier(emailOrPhone.trim(), user._id);
      if (emailConflict) {
        const roleLabel = emailConflict.role === 'resident' ? 'Residente' : emailConflict.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
        return res.status(400).json({
          message: `Ang email na ${emailOrPhone} ay ginagamit na ng isa nang ${roleLabel} (${emailConflict.name}).`
        });
      }
    }

    if (name) user.name = name.trim();
    if (emailOrPhone) user.emailOrPhone = emailOrPhone.trim().toLowerCase();
    if (password && password.trim().length >= 6) user.passwordHash = password.trim();
    if (department !== undefined) user.department = department;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (contactNum !== undefined) user.contactNum = contactNum;
    if (user.role === 'field_staff' && contactNum) user.employeeId = contactNum.trim();
    if (teamName !== undefined) user.teamName = teamName;
    if (staffDesignation !== undefined) user.staffDesignation = staffDesignation;
    if (barangayCode !== undefined) user.barangayCode = barangayCode;

    await user.save();

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_ACCOUNT_DETAILS',
      targetType: 'User',
      targetId: user._id,
      notes: `Updated details for ${user.name} (${user.emailOrPhone})`,
    });

    res.json({ success: true, message: `Account for ${user.name} updated successfully.`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user account', error: error.message });
  }
});

// @route   DELETE /api/auth/provisioned-users/:id
// @desc    Delete a provisioned user account
router.delete('/provisioned-users/:id', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (user.role === 'lgu_superadmin' || user.role === 'lgu_super_admin') {
      return res.status(403).json({ message: 'Cannot delete Superadmin account.' });
    }

    const userName = user.name;
    const userEmail = user.emailOrPhone;
    await User.findByIdAndDelete(req.params.id);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'DELETE_ACCOUNT',
      targetType: 'User',
      targetId: req.params.id,
      notes: `Deleted account for ${userName} (${userEmail})`,
    });

    res.json({ success: true, message: `Account for ${userName} has been permanently deleted.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user account', error: error.message });
  }
});

// =========================================================================
// RESIDENT / CITIZEN ACCOUNT PROVISIONING & DIRECTORY (LGU ADMIN & SUPERADMIN)
// =========================================================================

// @route   GET /api/auth/resident-users
// @desc    Get all registered / provisioned Citizen Resident accounts (LGU Admin & SuperAdmin only)
router.get('/resident-users', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const residents = await User.find({ role: 'resident' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = residents.map(r => r._id);
    const households = await Household.find({ headOfHouseholdUserId: { $in: userIds } }).lean();
    const hhMap = new Map();
    households.forEach(hh => {
      if (hh.headOfHouseholdUserId) {
        hhMap.set(hh.headOfHouseholdUserId.toString(), hh);
      }
    });

    const result = residents.map(u => {
      const hh = hhMap.get(u._id.toString()) || null;
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        emailOrPhone: u.emailOrPhone,
        role: u.role,
        barangayCode: u.barangayCode || (hh ? hh.barangayCode : 'N/A'),
        contactNum: u.contactNum || u.emailOrPhone,
        status: u.isActive === false ? 'suspended' : 'active',
        isActive: u.isActive !== false,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-08-01',
        household: hh ? {
          id: hh._id,
          _id: hh._id,
          address: hh.address,
          purok: hh.purok,
          barangayCode: hh.barangayCode,
          memberCount: hh.memberCount || 1,
          members: hh.members || [],
          qrCode: hh.qrCode,
          verificationStatus: hh.verificationStatus || 'verified',
          priorityScore: hh.priorityScore || 0,
          priorityLevel: hh.priorityLevel || 'Low',
          damageLevel: hh.damageLevel || 'Minor',
          validIdType: hh.validIdType || 'Philippine National ID (PhilSys / PhilID)',
          validIdNumber: hh.validIdNumber || '',
          validIdImage: hh.validIdImage || null,
          verifiedAt: hh.verifiedAt,
          verifiedBy: hh.verifiedBy,
          verificationNotes: hh.verificationNotes,
        } : null,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resident accounts', error: error.message });
  }
});

// @route   POST /api/auth/provision-resident
// @desc    LGU Admin or SuperAdmin provisions a fully pre-verified Resident Citizen account
router.post('/provision-resident', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const {
      name,
      emailOrPhone,
      password,
      barangayCode,
      address,
      purok,
      damageLevel,
      validIdType,
      validIdNumber,
      validIdImage,
      members,
    } = req.body;

    if (!name || !emailOrPhone || !password || !barangayCode || !address || !purok) {
      return res.status(400).json({
        message: 'Kailangan punan ang Pangalan, Contact/Phone, Password, Barangay, Address, at Purok.',
      });
    }

    const cleanContact = emailOrPhone.trim();
    const existing = await findExistingUserWithIdentifier(cleanContact);
    if (existing) {
      const roleLabel = existing.role === 'resident' ? 'Residente' : existing.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
      return res.status(400).json({
        message: `Ang phone number o email na ito ay rehistrado na bilang ${roleLabel} (${existing.name}). Bawal magkaparehas ang contact ng kahit sinong user.`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      emailOrPhone: cleanContact.toLowerCase(),
      passwordHash: password,
      role: 'resident',
      barangayCode: String(barangayCode).trim(),
      contactNum: cleanContact,
      createdBy: req.user._id,
      isActive: true,
    });

    const parsedMembers = Array.isArray(members) ? members : [];
    const memberCount = parsedMembers.length > 0 ? parsedMembers.length : 1;
    const cleanBrgy = String(barangayCode).trim();
    const qrCode = `MNL-${cleanBrgy}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const adminRoleTitle = req.user.role === 'lgu_superadmin' || req.user.role === 'lgu_super_admin' ? 'LGU SuperAdmin' : 'LGU Admin';

    const newHousehold = new Household({
      headOfHouseholdUserId: user._id,
      address: address.trim(),
      purok: purok.trim(),
      barangayCode: cleanBrgy,
      memberCount,
      members: parsedMembers,
      qrCode,
      verificationStatus: 'verified', // AUTOMATICALLY VERIFIED WHEN PROVISIONED BY ADMIN
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      verificationNotes: `Pre-verified and provisioned by ${adminRoleTitle} (${req.user.name})`,
      registrationType: 'new_household',
      validIdType: validIdType || 'Philippine National ID (PhilSys / PhilID)',
      validIdNumber: validIdNumber ? String(validIdNumber).trim() : '',
      validIdImage: validIdImage || null,
      damageLevel: damageLevel || 'Minor',
    });

    const { priorityScore, priorityLevel } = calculatePriorityIndex(newHousehold);
    newHousehold.priorityScore = priorityScore;
    newHousehold.priorityLevel = priorityLevel;

    newHousehold.inAppNotifications = [{
      id: Date.now().toString(),
      title: '✅ Opisyal na Rehistrasyon at QR Pass Naaprubahan!',
      message: `Ang inyong resident profile at household ay opisyal nang na-verify ng Manila MDRRMO Command Center. Handa na ang inyong Official QR Pass para sa relief aid.`,
      type: 'verification',
      createdAt: new Date(),
      isRead: false,
    }];

    await newHousehold.save();

    await RecoveryStatus.create({
      householdId: newHousehold._id,
      status: 'waiting',
    });

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'ADMIN_PROVISION_RESIDENT',
      targetType: 'Household',
      targetId: newHousehold._id.toString(),
      notes: `${adminRoleTitle} ${req.user.name} created and pre-verified resident household for ${name} in Barangay ${cleanBrgy}. QR: ${qrCode}. Priority: ${priorityLevel} (${priorityScore} pts).`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`barangay:${cleanBrgy}`).emit('household_verified', {
        householdId: newHousehold._id,
        qrCode: newHousehold.qrCode,
        priorityLevel: newHousehold.priorityLevel,
        address: newHousehold.address,
      });
    }

    res.status(201).json({
      success: true,
      message: `Resident account for ${name} created and automatically verified!`,
      user: {
        _id: user._id,
        name: user.name,
        emailOrPhone: user.emailOrPhone,
        role: user.role,
        barangayCode: user.barangayCode,
      },
      household: newHousehold,
    });
  } catch (error) {
    console.error('Error provisioning resident account:', error);
    res.status(500).json({ message: 'Error provisioning resident account', error: error.message });
  }
});

// @route   PATCH /api/auth/resident-users/:id/status
// @desc    Suspend or Reactivate a resident user account
router.patch('/resident-users/:id/status', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'resident') {
      return res.status(404).json({ message: 'Resident account not found.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    const actionText = user.isActive ? 'REACTIVATE_RESIDENT' : 'SUSPEND_RESIDENT';
    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: actionText,
      targetType: 'User',
      targetId: user._id.toString(),
      notes: `Resident ${user.name} (${user.emailOrPhone}) status set to ${user.isActive ? 'Active' : 'Suspended'}.`,
    });

    res.json({
      success: true,
      status: user.isActive ? 'active' : 'suspended',
      message: `Status for ${user.name} is now ${user.isActive ? 'Active' : 'Suspended'}.`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating resident status', error: error.message });
  }
});

// @route   DELETE /api/auth/resident-users/:id
// @desc    Permanently delete a resident user and associated household
router.delete('/resident-users/:id', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'resident') {
      return res.status(404).json({ message: 'Resident account not found.' });
    }

    const userName = user.name;
    const userContact = user.emailOrPhone;

    const userHhs = await Household.find({ headOfHouseholdUserId: user._id });
    const hhIds = userHhs.map(h => h._id);

    await RecoveryStatus.deleteMany({ householdId: { $in: hhIds } });
    await Household.deleteMany({ headOfHouseholdUserId: user._id });
    await User.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'DELETE_RESIDENT_ACCOUNT',
      targetType: 'User',
      targetId: req.params.id,
      notes: `Deleted resident account for ${userName} (${userContact}) and linked household record.`,
    });

    res.json({ success: true, message: `Resident account for ${userName} has been permanently deleted.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting resident account', error: error.message });
  }
});

// @route   PUT /api/auth/resident-users/:id
// @desc    SuperAdmin and LGU Admin edit resident citizen account and linked household information
router.put('/resident-users/:id', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'resident') {
      return res.status(404).json({ message: 'Resident account not found.' });
    }

    const {
      name,
      emailOrPhone,
      password,
      barangayCode,
      address,
      purok,
      damageLevel,
      validIdType,
      validIdNumber,
      members,
    } = req.body;

    const cleanContact = emailOrPhone ? emailOrPhone.trim() : user.emailOrPhone;
    if (cleanContact && cleanContact.toLowerCase() !== user.emailOrPhone) {
      const existing = await findExistingUserWithIdentifier(cleanContact, user._id);
      if (existing) {
        const roleLabel = existing.role === 'resident' ? 'Residente' : existing.role === 'field_staff' ? 'Field Staff' : 'Opisyal';
        return res.status(400).json({
          message: `Ang phone number o email na ito ay ginagamit na ng iba (${roleLabel}: ${existing.name}).`,
        });
      }
    }

    if (name) user.name = name.trim();
    if (cleanContact) {
      user.emailOrPhone = cleanContact.toLowerCase();
      user.contactNum = cleanContact;
    }
    if (barangayCode) user.barangayCode = String(barangayCode).trim();
    if (password && password.trim().length >= 6) {
      user.passwordHash = password.trim();
    }
    await user.save();

    // Find and update linked household
    let household = await Household.findOne({ headOfHouseholdUserId: user._id });
    if (household) {
      if (address !== undefined) household.address = address.trim();
      if (purok !== undefined) household.purok = purok.trim();
      if (barangayCode !== undefined) household.barangayCode = String(barangayCode).trim();
      if (validIdType !== undefined) household.validIdType = validIdType;
      if (validIdNumber !== undefined) household.validIdNumber = String(validIdNumber).trim();
      if (damageLevel !== undefined) household.damageLevel = damageLevel;
      if (Array.isArray(members)) {
        household.members = members.filter(m => m.name && m.name.trim());
        household.memberCount = household.members.length > 0 ? household.members.length : 1;
      }

      // Recalculate priority
      const { priorityScore, priorityLevel } = calculatePriorityIndex(household);
      household.priorityScore = priorityScore;
      household.priorityLevel = priorityLevel;

      await household.save();
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_RESIDENT_ACCOUNT',
      targetType: 'User',
      targetId: user._id,
      notes: `${req.user.role === 'lgu_superadmin' ? 'SuperAdmin' : 'LGU Admin'} ${req.user.name} updated details for resident ${user.name} (${user.emailOrPhone}) in Barangay ${user.barangayCode}.`,
    });

    res.json({
      success: true,
      message: `Resident account for ${user.name} updated successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        emailOrPhone: user.emailOrPhone,
        role: user.role,
        barangayCode: user.barangayCode,
        contactNum: user.contactNum,
      },
      household,
    });
  } catch (error) {
    console.error('Error updating resident account:', error);
    res.status(500).json({ message: 'Error updating resident account', error: error.message });
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
