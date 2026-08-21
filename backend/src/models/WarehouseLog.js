const mongoose = require('mongoose');

const warehouseLogSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseItem', required: true },
  action: { type: String, enum: ['restock', 'dispatch', 'adjust'], required: true },
  quantity: { type: Number, required: true },
  notes: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WarehouseLog', warehouseLogSchema);
