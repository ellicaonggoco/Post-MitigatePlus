const express = require('express');
const router = express.Router();
const WarehouseItem = require('../models/WarehouseItem');
const WarehouseLog = require('../models/WarehouseLog');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/warehouse - List all items
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin', 'field_staff', 'barangay_official'), async (req, res) => {
  try {
    let items = await WarehouseItem.find().sort({ category: 1, name: 1 });
    if (items.length === 0) {
      const defaultItems = [
        { name: 'All-in-One Family Relief Pack', category: 'Food', stock: 2500, unit: 'packs', minStock: 500 },
        { name: '5-Gallon Potable Drinking Water', category: 'Water', stock: 1800, unit: 'units', minStock: 300 },
        { name: 'Emergency Medical & First Aid Kit', category: 'Medicine', stock: 950, unit: 'kits', minStock: 200 },
        { name: 'Infant & Toddler Care Pack', category: 'Hygiene', stock: 600, unit: 'packs', minStock: 150 },
        { name: 'Senior Maintenance & Nutrition Pack', category: 'Medicine', stock: 750, unit: 'packs', minStock: 150 },
        { name: 'Emergency Family Shelter & Blanket Kit', category: 'Shelter', stock: 400, unit: 'kits', minStock: 100 },
      ];
      items = await WarehouseItem.insertMany(defaultItems);
    }
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
    const { purpose, destination, approvingOfficial, transporter, referenceNo } = req.body;
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

    await WarehouseLog.create({
      itemId: item._id,
      itemName: item.name,
      action: 'restock',
      quantity,
      purpose: purpose || 'Standard Replenishment',
      destination: destination || 'Central Warehouse Facility',
      approvingOfficial: approvingOfficial || req.user.name || 'Logistics Officer',
      transporter: transporter || 'DSWD / Supplier Delivery',
      referenceNo: referenceNo || notes || '',
      notes,
      performedBy: req.user._id,
      performedByName: req.user.name || 'System Admin',
    });

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'RESTOCK_WAREHOUSE',
      targetType: 'WarehouseItem',
      targetId: item._id,
      notes: `Restocked ${quantity} ${item.unit} for ${item.name} (Source: ${purpose || 'Standard'})`,
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/warehouse/:id/dispatch - Dispatch item
router.post('/:id/dispatch', protect, requireRole('lgu_admin', 'lgu_superadmin', 'field_staff'), async (req, res) => {
  try {
    const rawQty = req.body.quantity !== undefined ? req.body.quantity : req.body.qty;
    const { purpose, destination, approvingOfficial, transporter, referenceNo } = req.body;
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

    await WarehouseLog.create({
      itemId: item._id,
      itemName: item.name,
      action: 'dispatch',
      quantity,
      purpose: purpose || 'General Relief Operation',
      destination: destination || 'Evacuation Site / Recipient Agency',
      approvingOfficial: approvingOfficial || req.user.name || 'MDRRMO Officer',
      transporter: transporter || 'LGU Transport Unit',
      referenceNo: referenceNo || notes || '',
      notes,
      performedBy: req.user._id,
      performedByName: req.user.name || 'System Admin',
    });

    await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'DISPATCH_WAREHOUSE',
      targetType: 'WarehouseItem',
      targetId: item._id,
      notes: `Dispatched ${quantity} ${item.unit} for ${item.name} (Destination: ${destination || 'Ground'})`,
    });
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
