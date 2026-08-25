const mongoose = require('mongoose');

const distributionEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  itemType: { type: String, required: true },
  batchId: { type: String, required: true },
  barangayCode: { type: String, required: true },
  location: { type: String, required: true },
  assignedTeam: { type: String, default: 'Field Team Alpha' },
  scheduledDate: { type: String, default: null },
  scheduledTime: { type: String, default: null },
  targetHouseholds: { type: Number, default: 0 },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('DistributionEvent', distributionEventSchema);
