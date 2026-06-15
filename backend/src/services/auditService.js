const AuditLog = require('../models/AuditLog')

async function logActivity (req, action, category, target = '', detail = '') {
  try {
    await AuditLog.create({
      userId: req.user._id,
      actorEmail: req.user.email,
      action,
      category,
      target,
      detail,
      ipAddress: req.ip || '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    })
  } catch (error) {
    console.error('Audit log write failed:', error.message)
  }
}

module.exports = { logActivity }
