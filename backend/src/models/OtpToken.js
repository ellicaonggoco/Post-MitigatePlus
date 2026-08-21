const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
  phoneOrEmail: { type: String, required: true, index: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-deletes after 10 minutes (600s)
});

module.exports = mongoose.model('OtpToken', otpTokenSchema);
