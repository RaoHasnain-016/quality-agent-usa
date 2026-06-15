const mongoose = require('mongoose')
const { Schema } = mongoose

const reportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['executive', 'quality', 'risk', 'batch'], default: 'executive', index: true },
  status: { type: String, enum: ['draft', 'ready', 'scheduled'], default: 'ready', index: true },
  period: { type: String, default: 'All time' },
  sourceBatchIds: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
  recipients: [{ type: String }],
  schedule: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
  nextDeliveryAt: { type: Date, default: null },
  summary: Schema.Types.Mixed,
  dimensions: Schema.Types.Mixed,
  topIssues: [Schema.Types.Mixed],
  recommendations: [{ type: String }],
  priorityFailures: [Schema.Types.Mixed],
  recentBatches: [Schema.Types.Mixed],
  generatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

reportSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('Report', reportSchema)
