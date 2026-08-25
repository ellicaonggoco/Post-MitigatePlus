const mongoose = require('mongoose');

const damageReportSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true },
  damageLevel: {
    type: String,
    enum: ['Minor', 'Moderate', 'Severe', 'Totally Damaged'],
    required: true,
  },
  reportedDamageLevel: {
    type: String,
    enum: ['Minor', 'Moderate', 'Severe', 'Totally Damaged'],
  },
  validatedDamageLevel: {
    type: String,
    enum: ['Minor', 'Moderate', 'Severe', 'Totally Damaged'],
    default: null,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'adjusted', 'rejected'],
    default: 'pending',
  },
  photos: [{ type: String }],
  description: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  locationName: { type: String, default: '' },
  reportedAt: { type: Date, default: Date.now },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validatedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  rejectionReason: { type: String, default: null },
});

module.exports = mongoose.model('DamageReport', damageReportSchema);
