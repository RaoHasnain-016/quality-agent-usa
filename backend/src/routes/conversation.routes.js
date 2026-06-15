const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')

router.use(authMiddleware)

function escapeRegex (value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function workspaceFilter (req) {
  const filter = { userId: req.user._id }
  if (req.query.batchId) filter.batchId = req.query.batchId
  if (req.query.status === 'flagged') filter.flagged = true
  if (req.query.status === 'reviewed') filter.reviewed = true
  if (req.query.status === 'pending') filter.reviewed = false
  if (req.query.status === 'overridden') filter.overridden = true
  if (req.query.minScore || req.query.maxScore) {
    filter.overallScore = {}
    if (req.query.minScore) filter.overallScore.$gte = Number(req.query.minScore)
    if (req.query.maxScore) filter.overallScore.$lte = Number(req.query.maxScore)
  }
  if (req.query.issue) filter.issues = String(req.query.issue)
  if (req.query.q) {
    const query = new RegExp(escapeRegex(req.query.q), 'i')
    filter.$or = [{ externalId: query }, { summary: query }, { issues: query }]
  }
  return filter
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)))
    const skip = (page - 1) * limit
    const filter = workspaceFilter(req)
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      lowest: { overallScore: 1 },
      highest: { overallScore: -1 }
    }
    const sort = sortMap[req.query.sort] || { flagged: -1, overallScore: 1, createdAt: -1 }
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .select('-rawText')
        .populate('batchId', 'name batchName')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(filter)
    ])
    res.json({ conversations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id
    const [summary, issues] = await Promise.all([
      Conversation.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            flagged: { $sum: { $cond: ['$flagged', 1, 0] } },
            reviewed: { $sum: { $cond: ['$reviewed', 1, 0] } },
            overridden: { $sum: { $cond: ['$overridden', 1, 0] } },
            avgScore: { $avg: '$overallScore' }
          }
        }
      ]),
      Conversation.aggregate([
        { $match: { userId, issues: { $exists: true, $ne: [] } } },
        { $unwind: '$issues' },
        { $group: { _id: '$issues', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ])
    ])
    res.json({ ...(summary[0] || { total: 0, flagged: 0, reviewed: 0, overridden: 0, avgScore: 0 }), issues })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/bulk-review', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.slice(0, 100) : []
    if (!ids.length) return res.status(400).json({ error: 'Select at least one conversation' })
    const result = await Conversation.updateMany({ _id: { $in: ids }, userId: req.user._id }, { reviewed: true })
    res.json({ reviewed: result.modifiedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
