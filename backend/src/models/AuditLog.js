const mongoose = require('mongoose')
const { Schema } = mongoose

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorEmail: { type: String, required: true, trim: true },
  action: { type: String, required: true, trim: true, index: true },
  category: { type: String, enum: ['account', 'workspace', 'member', 'billing', 'support', 'evaluation'], default: 'workspace', index: true },
  target: { type: String, default: '', trim: true },
  detail: { type: String, default: '', trim: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
})

module.exports = mongoose.model('AuditLog', auditLogSchema)
