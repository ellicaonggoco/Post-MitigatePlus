const mongoose = require('mongoose');

const policyConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  baseCoverage: { type: Number, default: 5 },
  extraMemberTopUp: { type: Number, default: 0.5 },
  seniorTopUp: { type: Number, default: 0.5 },
  pwdTopUp: { type: Number, default: 0.5 },
  basePacksPerMember: { type: Number, default: 1 },
  topUpPregnant: { type: Number, default: 0.5 },
  maxClaimPerHousehold: { type: Number, default: 1 },
  fraudThreshold: { type: Number, default: 2 },
  priorityHighThreshold: { type: Number, default: 50 },
  priorityMedThreshold: { type: Number, default: 25 },
  allowSelfRegistration: { type: Boolean, default: true },
  requireIdUpload: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

module.exports = mongoose.model('PolicyConfig', policyConfigSchema);
