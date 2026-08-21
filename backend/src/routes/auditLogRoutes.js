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

module.exports = router;
