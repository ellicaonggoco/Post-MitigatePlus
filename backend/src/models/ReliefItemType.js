const mongoose = require('mongoose');

const reliefItemTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Family Food Pack", "Hygiene Kit", "Medicine", "Temporary Shelter"
  category: {
    type: String,
    enum: ['headcount_scaled', 'fixed_unit'],
    required: true,
  },
  baseCoverage: { type: Number, default: 5 }, // pax per base pack (for headcount_scaled)
  topUpUnitSize: { type: Number, default: 1 }, // pax per top up unit
  unit: { type: String, default: 'pack' }, // pack, kg, liter, piece, kit
  currentBaseStock: { type: Number, default: 1000 },
  currentTopUpStock: { type: Number, default: 2000 },
});

module.exports = mongoose.model('ReliefItemType', reliefItemTypeSchema);
