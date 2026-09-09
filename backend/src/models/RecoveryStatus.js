const mongoose = require('mongoose');

const recoveryStatusSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true, unique: true },
  status: {
    type: String,
    enum: [
      'verification',
      'assessed',
      'allocated',
      'ready',
      'claimed',
      'waiting',
      'assistance_received', 'received',
      'ongoing',
      'partially_recovered', 'partial',
      'fully_recovered', 'full'
    ],
    default: 'allocated',
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RecoveryStatus', recoveryStatusSchema);
