const mongoose = require('mongoose');

const assistanceRequestSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', default: null },
  recipientName: { type: String, default: '' },
  recipientPhone: { type: String, default: '' },
  recipientAddress: { type: String, default: '' },
  barangayCode: { type: String, default: '291' },
  memberCount: { type: Number, default: 1 },
  vulnerabilityTypes: [{ type: String }], // ['Senior Citizen', 'PWD', 'Infant Care', 'Solo Parent', 'Severe / Bedridden']
  severityLevel: { type: String, default: 'Standard Assistance' },
  itemType: { type: String, required: true }, // Food, Water, Medicine, Temporary Shelter, Clothing, Hygiene Kit, Shelter Repair Materials
  packages: [
    {
      id: { type: String },
      name: { type: String },
      category: { type: String },
      quantity: { type: Number, default: 1 },
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'released', 'received', 'rejected'],
    default: 'pending',
  },
  notes: { type: String, default: '' },
  requestedBy: { type: String, default: '' },
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
