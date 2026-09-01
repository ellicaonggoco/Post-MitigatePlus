const mongoose = require('mongoose');

// Field-staff-reported issues during a distribution drive - distinct from DamageReport
// (which is a resident's household damage) and AuditLog (system-generated events).
// e.g. stock shortages, lost QR passes, emergency evacuations spotted in the field.
const incidentSchema = new mongoose.Schema({
  incidentType: {
    type: String,
    enum: ['Stock Shortage', 'Nawawalang QR Pass', 'Emergency Evacuation', 'Other'],
    required: true,
  },
  notes: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  barangayCode: { type: String, required: true },
  distributionEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributionEvent', default: null },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
