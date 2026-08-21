const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  age: { type: Number, required: true },
  specialConditions: [{
    type: String,
    enum: ['senior', 'pwd', 'pregnant', 'child', 'medical'],
  }],
});

const householdSchema = new mongoose.Schema({
  headOfHouseholdUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  address: { type: String, required: true, index: true },
  purok: { type: String, required: true, index: true },
  barangayCode: { type: String, required: true, index: true },
  memberCount: { type: Number, required: true, default: 1 },
  memberCountPendingUpdate: { type: Number, default: null },
  members: [memberSchema],
  qrCode: { type: String, required: true, unique: true, index: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'needs_info', 'rejected'],
    default: 'pending',
    index: true,
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  verificationNotes: { type: String, default: '' },
  registrationType: {
    type: String,
    enum: ['new_household', 'join_existing'],
    default: 'new_household',
  },
  linkedHouseholdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', default: null },
  validIdType: { type: String, default: 'Government ID' },
  validIdImage: { type: String, default: null },
  validIdNumber: { type: String, default: '' },
  damageLevel: {
    type: String,
    enum: ['Minor', 'Moderate', 'Severe', 'Totally Damaged'],
    default: 'Minor',
  },
  priorityScore: { type: Number, default: 0, index: true },
  priorityLevel: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Low',
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Household', householdSchema);
