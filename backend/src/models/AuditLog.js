const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: 'system' },
  action: { type: String, required: true }, // APPROVE_ACCOUNT, REJECT_ACCOUNT, RELEASE_RELIEF, DUPLICATE_CLAIM_BLOCKED, OVERRIDE_QUANTITY
  targetType: { type: String, required: true }, // Household, Distribution, User
  targetId: { type: String, default: null },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
