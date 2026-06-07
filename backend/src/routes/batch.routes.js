const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')
const { createAndProcessBatch } = require('../services/batchService')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)))
    const skip = (page - 1) * limit
    const filter = { userId: req.user._id }

    if (req.query.status) filter.status = req.query.status

    const [batches, total] = await Promise.all([
      Batch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Batch.countDocuments(filter)
    ])

    res.json({
      batches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function uploadHandler (req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV or JSON file is required' })

    const batchName = String(req.body.batchName || req.body.name || '').trim() ||
      `Batch ${new Date().toISOString().slice(0, 10)}`

    const result = await createAndProcessBatch(req.user._id, req.file, batchName)
    res.status(202).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

router.post('/upload', upload.single('file'), uploadHandler)
router.post('/', upload.single('file'), uploadHandler)

router.get('/:id', async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, userId: req.user._id })
    if (!batch) return res.status(404).json({ error: 'Batch not found' })

    const [conversationCount, flaggedCount] = await Promise.all([
      Conversation.countDocuments({ batchId: batch._id }),
      Conversation.countDocuments({ batchId: batch._id, flagged: true })
    ])

    res.json({ ...batch.toJSON(), conversationCount, flaggedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, userId: req.user._id })
    if (!batch) return res.status(404).json({ error: 'Batch not found' })

    await Conversation.deleteMany({ batchId: batch._id })
    await batch.deleteOne()
    res.json({ message: 'Batch deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/export', async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, userId: req.user._id })
    if (!batch) return res.status(404).json({ error: 'Batch not found' })

    const conversations = await Conversation.find({ batchId: batch._id }).sort({ overallScore: 1 })
    const headers = [
      'id',
      'external_id',
      'overall_score',
      'accuracy',
      'policy',
      'resolution',
      'tone',
      'escalation',
      'flagged',
      'issues',
      'summary'
    ].join(',')

    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = conversations.map(c => [
      c._id,
      c.externalId,
      c.overallScore,
      c.accuracyScore,
      c.policyScore,
      c.resolutionScore,
      c.toneScore,
      c.escalationScore,
      c.flagged,
      escapeCsv((c.issues || []).join('; ')),
      escapeCsv(c.summary)
    ].join(','))

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="batch-${batch._id}-results.csv"`)
    res.send([headers, ...rows].join('\n'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
