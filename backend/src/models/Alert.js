const mongoose = require('mongoose')
const { Schema } = mongoose

const alertSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: { type: String, enum: ['conversation', 'batch', 'system'], required: true },
  sourceId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium', index: true },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open', index: true },
  category: { type: String, default: 'quality', index: true },
  score: { type: Number, default: null },
  acknowledgedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
})

alertSchema.index({ userId: 1, sourceType: 1, sourceId: 1 }, { unique: true })
alertSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('Alert', alertSchema)
