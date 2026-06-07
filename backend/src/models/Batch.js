const mongoose = require('mongoose')
const { Schema } = mongoose

const batchSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  batchName: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'complete', 'failed'],
    default: 'pending',
    index: true
  },
  totalConversations: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  processedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  avgAccuracy: { type: Number, default: 0 },
  avgPolicy: { type: Number, default: 0 },
  avgResolution: { type: Number, default: 0 },
  avgTone: { type: Number, default: 0 },
  avgEscalation: { type: Number, default: 0 },
  alertThreshold: { type: Number, default: 70 },
  alertSent: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
})

batchSchema.virtual('progressPct').get(function () {
  if (!this.totalConversations) return 0
  return Math.round((this.processedCount / this.totalConversations) * 100)
})

batchSchema.pre('validate', function (next) {
  if (!this.name && this.batchName) this.name = this.batchName
  if (!this.batchName && this.name) this.batchName = this.name
  this.totalCount = this.totalConversations
  next()
})

batchSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Batch', batchSchema)
