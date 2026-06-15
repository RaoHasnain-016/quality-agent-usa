const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Alert = require('../models/Alert')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')

router.use(authMiddleware)

function severityForScore (score) {
  if (score < 40) return 'critical'
  if (score < 60) return 'high'
  if (score < 75) return 'medium'
  return 'low'
}

async function syncAlerts (userId) {
  const [conversations, batches] = await Promise.all([
    Conversation.find({ userId, flagged: true }).select('_id externalId summary issues overallScore createdAt').limit(500),
    Batch.find({ userId, $expr: { $lt: ['$avgScore', '$alertThreshold'] }, status: 'complete' }).select('_id name batchName avgScore alertThreshold completedAt createdAt').limit(100)
  ])
  const operations = [
    ...conversations.map(item => ({
      updateOne: {
        filter: { userId, sourceType: 'conversation', sourceId: item._id },
        update: {
          $setOnInsert: {
            userId,
            sourceType: 'conversation',
            sourceId: item._id,
            title: item.issues?.[0] || 'Flagged conversation requires review',
            detail: item.summary || `Conversation ${item.externalId || item._id} scored below the quality threshold.`,
            severity: severityForScore(item.overallScore),
            category: item.issues?.[0] || 'conversation quality',
            score: item.overallScore,
            createdAt: item.createdAt
          }
        },
        upsert: true
      }
    })),
    ...batches.map(item => ({
      updateOne: {
        filter: { userId, sourceType: 'batch', sourceId: item._id },
        update: {
          $setOnInsert: {
            userId,
            sourceType: 'batch',
            sourceId: item._id,
            title: `${item.name || item.batchName} breached its quality threshold`,
            detail: `Batch average ${item.avgScore}/100 is below the configured threshold of ${item.alertThreshold}/100.`,
            severity: severityForScore(item.avgScore),
            category: 'batch quality',
            score: item.avgScore,
            createdAt: item.completedAt || item.createdAt
          }
        },
        upsert: true
      }
    }))
  ]
  if (operations.length) await Alert.bulkWrite(operations, { ordered: false })
}

router.get('/summary', async (req, res) => {
  try {
    await syncAlerts(req.user._id)
    const [statuses, severities, categories] = await Promise.all([
      Alert.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Alert.aggregate([{ $match: { userId: req.user._id, status: { $ne: 'resolved' } } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Alert.aggregate([{ $match: { userId: req.user._id, status: { $ne: 'resolved' } } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }])
    ])
    res.json({ statuses, severities, categories, threshold: req.user.alertThreshold, email: req.user.alertEmail || req.user.email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    await syncAlerts(req.user._id)
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)))
    const filter = { userId: req.user._id }
    if (req.query.status) filter.status = req.query.status
    if (req.query.severity) filter.severity = req.query.severity
    if (req.query.category) filter.category = req.query.category
    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ status: 1, severity: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Alert.countDocuments(filter)
    ])
    res.json({ alerts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const status = String(req.body.status || '')
    if (!['acknowledged', 'resolved'].includes(status)) return res.status(400).json({ error: 'Status must be acknowledged or resolved' })
    const updates = { status, updatedAt: new Date() }
    if (status === 'acknowledged') updates.acknowledgedAt = new Date()
    if (status === 'resolved') {
      updates.resolvedAt = new Date()
      updates.resolutionNote = String(req.body.note || '')
    }
    const alert = await Alert.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true })
    if (!alert) return res.status(404).json({ error: 'Alert not found' })
    res.json(alert)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
