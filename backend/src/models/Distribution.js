const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema({
  distributionEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributionEvent', required: true, index: true },
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true, index: true },
  itemType: { type: String, required: true },
  baseUnitsGiven: { type: Number, required: true },
  topUpUnitsGiven: { type: Number, required: true },
  householdSizeAtDistribution: { type: Number, required: true }, // snapshot for audit
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  releasedAt: { type: Date, default: Date.now },
  overrideReason: { type: String, default: null }, // Nullable, required if staff deviates from computed recommendation
});

// Enforce compound index for anti-duplicate prevention
distributionSchema.index({ distributionEventId: 1, householdId: 1 }, { unique: true });

module.exports = mongoose.model('Distribution', distributionSchema);
