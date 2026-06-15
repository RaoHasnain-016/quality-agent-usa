const mongoose = require('mongoose')
const { Schema } = mongoose

const supportTicketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, enum: ['product', 'billing', 'evaluation', 'security', 'integration'], default: 'product' },
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

supportTicketSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('SupportTicket', supportTicketSchema)
