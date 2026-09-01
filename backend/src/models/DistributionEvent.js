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
  announcementMessage: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Scheduled',
  },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: false },
});

module.exports = mongoose.model('DistributionEvent', distributionEventSchema);
