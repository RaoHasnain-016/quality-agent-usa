const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Conversation = require('../models/Conversation')
const Batch = require('../models/Batch')

router.use(authMiddleware)

router.get('/overview', async (req, res) => {
  const userId = req.user._id
  const [summary, dimensions, statuses, topIssues] = await Promise.all([
    Conversation.aggregate([
      { $match: { userId, overallScore: { $ne: null } } },
      { $group: { _id: null, total: { $sum: 1 }, avgScore: { $avg: '$overallScore' }, flagged: { $sum: { $cond: ['$flagged', 1, 0] } }, reviewed: { $sum: { $cond: ['$reviewed', 1, 0] } } } }
    ]),
    Conversation.aggregate([
      { $match: { userId, overallScore: { $ne: null } } },
      { $group: { _id: null, accuracy: { $avg: '$accuracyScore' }, policy: { $avg: '$policyScore' }, resolution: { $avg: '$resolutionScore' }, tone: { $avg: '$toneScore' }, escalation: { $avg: '$escalationScore' } } }
    ]),
    Batch.aggregate([{ $match: { userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Conversation.aggregate([
      { $match: { userId, issues: { $exists: true, $ne: [] } } },
      { $unwind: '$issues' },
      { $group: { _id: '$issues', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ])
  res.json({ summary: summary[0] || {}, dimensions: dimensions[0] || {}, statuses, topIssues })
})

router.get('/trends', async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days || 30)))
  const since = new Date(Date.now() - days * 86400000)
  const trend = await Conversation.aggregate([
    { $match: { userId: req.user._id, evaluatedAt: { $gte: since }, overallScore: { $ne: null } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$evaluatedAt' } }, score: { $avg: '$overallScore' }, volume: { $sum: 1 }, flagged: { $sum: { $cond: ['$flagged', 1, 0] } } } },
    { $sort: { _id: 1 } }
  ])
  res.json(trend.map(point => ({ date: point._id, score: Math.round(point.score), volume: point.volume, flagged: point.flagged })))
})

router.get('/distribution', async (req, res) => {
  const buckets = await Conversation.aggregate([
    { $match: { userId: req.user._id, overallScore: { $ne: null } } },
    {
      $bucket: {
        groupBy: '$overallScore',
        boundaries: [0, 40, 60, 80, 101],
        default: 'unknown',
        output: { count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } }
      }
    }
  ])
  res.json(buckets.map(bucket => ({ range: String(bucket._id), count: bucket.count, avgScore: Math.round(bucket.avgScore || 0) })))
})

router.get('/failures', async (req, res) => {
  const userId = req.user._id
  const [clusters, priority] = await Promise.all([
    Conversation.aggregate([
      { $match: { userId, flagged: true, issues: { $exists: true, $ne: [] } } },
      { $unwind: '$issues' },
      { $group: { _id: '$issues', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' }, minScore: { $min: '$overallScore' } } },
      { $sort: { count: -1, avgScore: 1 } },
      { $limit: 12 }
    ]),
    Conversation.find({ userId, flagged: true }).select('-rawText').populate('batchId', 'name batchName').sort({ overallScore: 1 }).limit(15)
  ])
  res.json({ clusters, priority })
})

router.get('/batches', async (req, res) => {
  const batches = await Batch.find({ userId: req.user._id, status: 'complete' })
    .select('name batchName avgScore avgAccuracy avgPolicy avgResolution avgTone avgEscalation totalConversations failedCount completedAt createdAt')
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(30)
  res.json(batches)
})

router.get('/activity', async (req, res) => {
  const [batches, conversations] = await Promise.all([
    Batch.find({ userId: req.user._id }).select('name batchName status processedCount totalConversations avgScore updatedAt createdAt').sort({ createdAt: -1 }).limit(8),
    Conversation.find({ userId: req.user._id }).select('externalId overallScore flagged issues summary evaluatedAt createdAt').sort({ evaluatedAt: -1, createdAt: -1 }).limit(12)
  ])
  res.json({ generatedAt: new Date(), batches, conversations })
})

module.exports = router
