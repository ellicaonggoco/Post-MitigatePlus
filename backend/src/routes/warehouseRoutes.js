const express = require('express');
const router = express.Router();
const WarehouseItem = require('../models/WarehouseItem');
const WarehouseLog = require('../models/WarehouseLog');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/warehouse - List all items
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'field_staff', 'barangay_official'), async (req, res) => {
  try {
    const items = await WarehouseItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/warehouse - Add new item
router.post('/', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const item = await WarehouseItem.create({ ...req.body, updatedBy: req.user._id });
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'ADD_WAREHOUSE_ITEM', targetType: 'WarehouseItem', targetId: item._id, notes: `Added ${item.name}` });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/warehouse/:id - Update item
router.put('/:id', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const item = await WarehouseItem.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/warehouse/:id/restock - Restock item
router.post('/:id/restock', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const rawQty = req.body.quantity !== undefined ? req.body.quantity : req.body.qty;
    const notes = req.body.notes || req.body.note || '';
    const quantity = Number(rawQty);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Valid positive quantity is required.' });
    }

    const item = await WarehouseItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.stock += quantity;
    item.lastRestocked = new Date();
    item.updatedBy = req.user._id;
    await item.save();
    await WarehouseLog.create({ itemId: item._id, action: 'restock', quantity, notes, performedBy: req.user._id });
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'RESTOCK_WAREHOUSE', targetType: 'WarehouseItem', targetId: item._id, notes: `Restocked ${quantity} ${item.unit}` });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/warehouse/:id/dispatch - Dispatch item
router.post('/:id/dispatch', protect, requireRole('lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
  try {
    const rawQty = req.body.quantity !== undefined ? req.body.quantity : req.body.qty;
    const notes = req.body.notes || req.body.note || '';
    const quantity = Number(rawQty);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Valid positive quantity is required.' });
    }

    const item = await WarehouseItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.stock < quantity) return res.status(400).json({ message: `Insufficient stock. Available: ${item.stock} ${item.unit}` });
    item.stock -= quantity;
    item.updatedBy = req.user._id;
    await item.save();
    await WarehouseLog.create({ itemId: item._id, action: 'dispatch', quantity, notes, performedBy: req.user._id });
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'DISPATCH_WAREHOUSE', targetType: 'WarehouseItem', targetId: item._id, notes: `Dispatched ${quantity} ${item.unit}` });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/warehouse/logs - Get warehouse activity logs
router.get('/logs', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const logs = await WarehouseLog.find().sort({ timestamp: -1 }).limit(100).populate('itemId', 'name unit').populate('performedBy', 'name role');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/warehouse/:id - Delete item
router.delete('/:id', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const item = await WarehouseItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await AuditLog.create({ actorUserId: req.user._id, actorRole: req.user.role, action: 'DELETE_WAREHOUSE_ITEM', targetType: 'WarehouseItem', targetId: req.params.id, notes: `Deleted ${item.name}` });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
