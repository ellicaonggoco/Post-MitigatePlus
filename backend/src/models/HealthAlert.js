const mongoose = require('mongoose');

const HealthAlertSchema = new mongoose.Schema({
  barangayCode: { type: String, required: true },
  diseaseType: { 
    type: String, 
    enum: ['leptospirosis', 'dengue', 'gastroenteritis', 'chronic_care'], 
    default: 'leptospirosis' 
  },
  riskScore: { type: Number, required: true }, // 0 to 100
  riskLevel: { type: String, enum: ['LOW', 'MODERATE', 'CRITICAL'], default: 'LOW' },
  activeCasesCount: { type: Number, default: 0 },
  floodDurationDays: { type: Number, default: 1 },
  recommendedAction: { type: String },
  localBhcStockDoxycycline: { type: Number, default: 50 }, // Remaining BHC units
  warehouseRestockDispatched: { type: Boolean, default: false },
  lastRestockDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('HealthAlert', HealthAlertSchema);
