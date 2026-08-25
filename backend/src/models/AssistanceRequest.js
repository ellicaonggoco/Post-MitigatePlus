const mongoose = require('mongoose');

const assistanceRequestSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true },
  itemType: { type: String, required: true }, // Food, Water, Medicine, Temporary Shelter, Clothing, Hygiene Kit, Shelter Repair Materials
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'released', 'received'],
    default: 'pending',
  },
  notes: { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deliveredAt: { type: Date, default: null },
  proofOfDeliveryPhoto: { type: String, default: null },
  recipientSignatureOrNotes: { type: String, default: '' },
});

module.exports = mongoose.model('AssistanceRequest', assistanceRequestSchema);
