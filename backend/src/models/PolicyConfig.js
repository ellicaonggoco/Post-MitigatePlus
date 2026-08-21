const mongoose = require('mongoose');

const policyConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  baseCoverage: { type: Number, default: 5 },
  extraMemberTopUp: { type: Number, default: 0.5 },
  seniorTopUp: { type: Number, default: 0.5 },
  pwdTopUp: { type: Number, default: 0.5 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PolicyConfig', policyConfigSchema);
