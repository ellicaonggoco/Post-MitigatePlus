const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
  phoneOrEmail: { type: String, required: true, index: true },
  code: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, expires: 900 } // Auto-deletes after 15 minutes (900s)
});

module.exports = mongoose.model('OtpToken', otpTokenSchema);
