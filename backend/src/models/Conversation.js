const mongoose = require('mongoose')
const { Schema } = mongoose

const conversationSchema = new Schema({
  batchId:         { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  externalId:      { type: String, default: '' },   // original ID from their system
  rawText:         { type: String, required: true },

  // AI Scores (0–100)
  accuracyScore:   { type: Number, default: null },
  policyScore:     { type: Number, default: null },
  resolutionScore: { type: Number, default: null },
  toneScore:       { type: Number, default: null },
  escalationScore: { type: Number, default: null },
  overallScore:    { type: Number, default: null },

  // AI Analysis
  issues:          [{ type: String }],
  summary:         { type: String, default: '' },

  // Status flags
  flagged:         { type: Boolean, default: false, index: true },
  reviewed:        { type: Boolean, default: false },
  overridden:      { type: Boolean, default: false },
  overrideScore:   { type: Number, default: null },
  overrideNote:    { type: String, default: '' },

  evaluatedAt:     { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now }
})

// Score color helper for frontend
conversationSchema.virtual('scoreColor').get(function () {
  const s = this.overridden ? this.overrideScore : this.overallScore
  if (s === null) return 'gray'
  if (s >= 80) return 'green'
  if (s >= 60) return 'amber'
  return 'red'
})

conversationSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Conversation', conversationSchema)
