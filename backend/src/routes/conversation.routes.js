const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')

router.use(authMiddleware)

async function ensureBatch (batchId, userId) {
  return Batch.findOne({ _id: batchId, userId })
}

async function listConversations (req, res, flaggedOnly = false) {
  try {
    const batch = await ensureBatch(req.params.batchId, req.user._id)
    if (!batch) {
      if (!flaggedOnly) {
        const conversation = await Conversation.findOne({ _id: req.params.batchId, userId: req.user._id })
        if (conversation) return res.json(conversation)
      }
      return res.status(404).json({ error: 'Batch or conversation not found' })
    }

    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)))
    const skip = (page - 1) * limit
    const filter = { batchId: batch._id, userId: req.user._id }

    if (flaggedOnly || req.query.flagged === 'true') filter.flagged = true
    if (req.query.reviewed === 'true') filter.reviewed = true

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .select(req.query.includeRaw === 'true' ? '' : '-rawText')
        .sort({ flagged: -1, overallScore: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(filter)
    ])

    res.json({
      conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

router.get('/detail/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conversation)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/detail/:id/review', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { reviewed: true },
      { new: true }
    )
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conversation)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/detail/:id/override', async (req, res) => {
  try {
    const overrideScore = Number(req.body.overrideScore)
    if (!Number.isFinite(overrideScore) || overrideScore < 0 || overrideScore > 100) {
      return res.status(400).json({ error: 'overrideScore must be between 0 and 100' })
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        overridden: true,
        overrideScore,
        overrideNote: String(req.body.note || ''),
        reviewed: true
      },
      { new: true }
    )

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conversation)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:batchId/flagged', (req, res) => listConversations(req, res, true))
router.get('/:batchId', (req, res) => listConversations(req, res, false))

module.exports = router
