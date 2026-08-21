const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emailOrPhone: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['resident', 'field_staff', 'barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'],
    required: true,
  },
  barangayCode: {
    type: String,
    default: null,
    // Required for field_staff and barangay_official to scope what they can see/act on
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // For barangay_official and field_staff accounts provisioned by lgu_admin
  },
  fcmToken: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  passwordChangedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Prevent double-hashing if the string is already a bcrypt hash
  if (typeof this.passwordHash === 'string' && /^\$2[aby]\$\d+\$/.test(this.passwordHash)) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

module.exports = mongoose.model('User', userSchema);
