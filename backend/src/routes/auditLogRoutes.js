const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/audit-logs - List audit logs with pagination
router.get('/', protect, requireRole('lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actorRole) filter.actorRole = req.query.actorRole;
    
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('actorUserId', 'name role'),
      AuditLog.countDocuments(filter)
    ]);
    
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/audit-logs - Create a new audit log entry
router.post('/', protect, async (req, res) => {
  try {
    const { action, targetType, targetId, notes } = req.body;
    if (!action || !targetType) {
      return res.status(400).json({ message: 'action and targetType are required' });
    }
    const log = await AuditLog.create({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action,
      targetType,
      targetId: targetId || null,
      notes: notes || '',
      timestamp: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      if (action === 'EXECUTIVE_RELIEF_DIRECTIVE') {
        io.to('admin_room').emit('executive_directive', {
          barangayCode: targetId,
          notes,
          issuedBy: req.user.name || req.user.role,
          timestamp: log.timestamp,
        });
      }
      io.to('admin_room').emit('audit_log_created', log);
    }

    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
