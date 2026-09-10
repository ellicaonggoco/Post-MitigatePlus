const mongoose = require('mongoose');

// Field-staff-reported issues during a distribution drive - distinct from DamageReport
// (which is a resident's household damage) and AuditLog (system-generated events).
// e.g. stock shortages, lost QR passes, emergency evacuations spotted in the field.
const incidentSchema = new mongoose.Schema({
  incidentType: {
    type: String,
    required: true,
    default: 'Stock Shortage',
  },
  notes: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  barangayCode: { type: String, required: true },
  distributionEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributionEvent', default: null },
  gpsLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  photoUri: { type: String, default: null },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
  resolutionNotes: { type: String, default: '' },
  resolutionDetails: {
    actionType: { type: String, default: '' },
    directive: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    itemType: { type: String, default: '' },
    sourceLocation: { type: String, default: '' },
    dispatchMethod: { type: String, default: '' },
    assignedPersonnel: { type: String, default: '' },
    beneficiaryName: { type: String, default: '' },
    idPresented: { type: String, default: '' },
    evacSite: { type: String, default: '' },
    evacueesCount: { type: Number, default: 0 },
    voucherCode: { type: String, default: '' },
  },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
