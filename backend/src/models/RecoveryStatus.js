const mongoose = require('mongoose');

const recoveryStatusSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true, unique: true },
  status: {
    type: String,
    enum: ['waiting', 'assistance_received', 'ongoing', 'partially_recovered', 'fully_recovered'],
    default: 'waiting',
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RecoveryStatus', recoveryStatusSchema);
