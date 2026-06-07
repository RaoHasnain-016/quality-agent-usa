const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')

router.use(authMiddleware)

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      totalBatches,
      completedBatches,
      batchesThisMonth,
      totalConversations,
      flaggedConversations,
      scoreAgg,
      trendData,
      dimensionAgg
    ] = await Promise.all([
      Batch.countDocuments({ userId }),
      Batch.countDocuments({ userId, status: 'complete' }),
      Batch.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
      Conversation.countDocuments({ userId }),
      Conversation.countDocuments({ userId, flagged: true }),
      Conversation.aggregate([
        { $match: { userId, overallScore: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
      ]),
      Batch.aggregate([
        {
          $match: {
            userId,
            status: 'complete',
            completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            score: { $avg: '$avgScore' }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', score: { $round: ['$score', 1] } } }
      ]),
      Conversation.aggregate([
        { $match: { userId, overallScore: { $ne: null } } },
        {
          $group: {
            _id: null,
            accuracy: { $avg: '$accuracyScore' },
            policy: { $avg: '$policyScore' },
            resolution: { $avg: '$resolutionScore' },
            tone: { $avg: '$toneScore' },
            escalation: { $avg: '$escalationScore' }
          }
        }
      ])
    ])

    const dimensions = dimensionAgg[0] || {}

    res.json({
      totalEvaluations: totalConversations,
      totalConversations,
      avgScore: Math.round(scoreAgg[0]?.avgScore || 0),
      failedCount: flaggedConversations,
      flaggedConversations,
      batchesThisMonth,
      totalBatches,
      completedBatches,
      evalUsed: req.user.evalUsed,
      evalLimit: req.user.evalLimit,
      trendData,
      issueBreakdown: {
        accuracy: Math.round(dimensions.accuracy || 0),
        policy: Math.round(dimensions.policy || 0),
        resolution: Math.round(dimensions.resolution || 0),
        tone: Math.round(dimensions.tone || 0),
        escalation: Math.round(dimensions.escalation || 0)
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/recent-batches', async (req, res) => {
  try {
    const batches = await Batch.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)

    res.json(batches)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
