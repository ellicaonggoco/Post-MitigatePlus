const mongoose = require('mongoose');

const warehouseLogSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseItem', required: true },
  itemName: { type: String, default: '' },
  action: { type: String, enum: ['restock', 'dispatch', 'adjust'], required: true },
  quantity: { type: Number, required: true },
  purpose: { type: String, default: 'General Relief Operation' },
  destination: { type: String, default: 'Central Facility' },
  approvingOfficial: { type: String, default: 'MDRRMO Logistics Head' },
  transporter: { type: String, default: 'LGU Transport Unit' },
  referenceNo: { type: String, default: '' },
  notes: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performedByName: { type: String, default: 'System Admin' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WarehouseLog', warehouseLogSchema);
