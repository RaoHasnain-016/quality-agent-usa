const mongoose = require('mongoose')
const { Schema } = mongoose

const workspaceMemberSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '', trim: true },
  role: { type: String, enum: ['admin', 'analyst', 'reviewer', 'viewer'], default: 'reviewer' },
  status: { type: String, enum: ['pending', 'active', 'revoked'], default: 'pending' },
  inviteToken: { type: String, required: true, unique: true, index: true },
  invitedAt: { type: Date, default: Date.now },
  lastInviteSentAt: { type: Date, default: null },
  joinedAt: { type: Date, default: null }
}, { timestamps: true })

workspaceMemberSchema.index({ ownerId: 1, email: 1 }, { unique: true })

module.exports = mongoose.model('WorkspaceMember', workspaceMemberSchema)
