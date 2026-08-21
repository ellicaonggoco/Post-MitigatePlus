const mongoose = require('mongoose');

const warehouseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['Food', 'Hygiene', 'Medicine', 'Shelter', 'Water', 'Other'], required: true },
  stock: { type: Number, default: 0 },
  unit: { type: String, default: 'packs' },
  minStock: { type: Number, default: 50 },
  lastRestocked: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

module.exports = mongoose.model('WarehouseItem', warehouseItemSchema);
