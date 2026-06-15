const mongoose = require('mongoose')
const { Schema } = mongoose

const researchStudySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  objective: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'running', 'complete', 'failed'], default: 'draft', index: true },
  sourceBatchIds: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
  findings: [{
    title: String,
    evidence: String,
    confidence: Number,
    severity: String
  }],
  summary: { type: String, default: '' },
  confidence: { type: Number, default: 0 },
  sampleSize: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
})

module.exports = mongoose.model('ResearchStudy', researchStudySchema)
