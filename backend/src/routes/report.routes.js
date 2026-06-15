const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')
const Report = require('../models/Report')

router.use(authMiddleware)

function nextDelivery (schedule) {
  if (schedule === 'none') return null
  const date = new Date()
  date.setDate(date.getDate() + (schedule === 'daily' ? 1 : schedule === 'weekly' ? 7 : 30))
  return date
}

async function snapshot (userId, sourceBatchIds = []) {
  const match = { userId, overallScore: { $ne: null } }
  if (sourceBatchIds.length) match.batchId = { $in: sourceBatchIds }
  const batchMatch = { userId }
  if (sourceBatchIds.length) batchMatch._id = { $in: sourceBatchIds }
  const [scores, dimensions, issues, failures, batches] = await Promise.all([
    Conversation.aggregate([{ $match: match }, { $group: { _id: null, average: { $avg: '$overallScore' }, total: { $sum: 1 }, flagged: { $sum: { $cond: ['$flagged', 1, 0] } }, reviewed: { $sum: { $cond: ['$reviewed', 1, 0] } } } }]),
    Conversation.aggregate([{ $match: match }, { $group: { _id: null, accuracy: { $avg: '$accuracyScore' }, policy: { $avg: '$policyScore' }, resolution: { $avg: '$resolutionScore' }, tone: { $avg: '$toneScore' }, escalation: { $avg: '$escalationScore' } } }]),
    Conversation.aggregate([{ $match: { ...match, issues: { $exists: true, $ne: [] } } }, { $unwind: '$issues' }, { $group: { _id: '$issues', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    Conversation.find({ ...match, flagged: true }).sort({ overallScore: 1 }).limit(8).select('externalId overallScore issues summary batchId'),
    Batch.find(batchMatch).sort({ createdAt: -1 }).limit(10).select('name batchName avgScore failedCount totalConversations status createdAt')
  ])
  const summary = scores[0] || { average: 0, total: 0, flagged: 0, reviewed: 0 }
  const dimensionData = dimensions[0] || {}
  const recommendations = issues.slice(0, 4).map(issue => `Investigate "${issue._id}" and review the ${issue.count} affected conversations.`)
  if (!recommendations.length) recommendations.push('Maintain current quality controls and continue monitoring production evaluations.')
  return { summary, dimensions: dimensionData, topIssues: issues, recommendations, priorityFailures: failures, recentBatches: batches, generatedAt: new Date() }
}

router.get('/executive', async (req, res) => {
  res.json(await snapshot(req.user._id))
})

router.get('/summary', async (req, res) => {
  const [statuses, types, total] = await Promise.all([
    Report.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Report.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Report.countDocuments({ userId: req.user._id })
  ])
  res.json({ total, statuses, types })
})

router.get('/', async (req, res) => {
  const filter = { userId: req.user._id }
  if (req.query.status) filter.status = req.query.status
  if (req.query.type) filter.type = req.query.type
  res.json(await Report.find(filter).sort({ createdAt: -1 }).select('-priorityFailures'))
})

router.post('/', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Report title is required' })
    const sourceBatchIds = Array.isArray(req.body.sourceBatchIds) ? req.body.sourceBatchIds : []
    const data = await snapshot(req.user._id, sourceBatchIds)
    const schedule = ['daily', 'weekly', 'monthly'].includes(req.body.schedule) ? req.body.schedule : 'none'
    const report = await Report.create({
      userId: req.user._id,
      title,
      type: req.body.type || 'executive',
      period: String(req.body.period || 'All time'),
      sourceBatchIds,
      recipients: Array.isArray(req.body.recipients) ? req.body.recipients.map(String) : [],
      schedule,
      status: schedule === 'none' ? 'ready' : 'scheduled',
      nextDeliveryAt: nextDelivery(schedule),
      ...data
    })
    res.status(201).json(report)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id, userId: req.user._id }).populate('sourceBatchIds', 'name batchName avgScore totalConversations')
  if (!report) return res.status(404).json({ error: 'Report not found' })
  res.json(report)
})

router.patch('/:id/schedule', async (req, res) => {
  const schedule = ['none', 'daily', 'weekly', 'monthly'].includes(req.body.schedule) ? req.body.schedule : 'none'
  const report = await Report.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { schedule, status: schedule === 'none' ? 'ready' : 'scheduled', nextDeliveryAt: nextDelivery(schedule), recipients: Array.isArray(req.body.recipients) ? req.body.recipients.map(String) : [] }, { new: true })
  if (!report) return res.status(404).json({ error: 'Report not found' })
  res.json(report)
})

router.delete('/:id', async (req, res) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!report) return res.status(404).json({ error: 'Report not found' })
  res.json({ message: 'Report deleted' })
})

module.exports = router
