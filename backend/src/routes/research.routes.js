const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const ResearchStudy = require('../models/ResearchStudy')
const { runStudy } = require('../services/researchService')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const filter = { userId: req.user._id }
  if (req.query.status) filter.status = req.query.status
  const studies = await ResearchStudy.find(filter).populate('sourceBatchIds', 'name batchName totalConversations avgScore').sort({ createdAt: -1 })
  res.json(studies)
})

router.get('/summary', async (req, res) => {
  const userId = req.user._id
  const [statuses, aggregate, topFindings] = await Promise.all([
    ResearchStudy.aggregate([{ $match: { userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ResearchStudy.aggregate([{ $match: { userId, status: 'complete' } }, { $group: { _id: null, avgConfidence: { $avg: '$confidence' }, totalSamples: { $sum: '$sampleSize' }, totalFindings: { $sum: { $size: '$findings' } } } }]),
    ResearchStudy.aggregate([{ $match: { userId, status: 'complete' } }, { $unwind: '$findings' }, { $group: { _id: '$findings.title', count: { $sum: 1 }, confidence: { $avg: '$findings.confidence' } } }, { $sort: { count: -1 } }, { $limit: 6 }])
  ])
  res.json({ statuses, ...(aggregate[0] || { avgConfidence: 0, totalSamples: 0, totalFindings: 0 }), topFindings })
})

router.post('/', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Research title is required' })
    const study = await ResearchStudy.create({
      userId: req.user._id,
      title,
      objective: String(req.body.objective || '').trim(),
      sourceBatchIds: Array.isArray(req.body.sourceBatchIds) ? req.body.sourceBatchIds : []
    })
    res.status(201).json(study)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  const study = await ResearchStudy.findOne({ _id: req.params.id, userId: req.user._id }).populate('sourceBatchIds', 'name batchName totalConversations avgScore status')
  if (!study) return res.status(404).json({ error: 'Research study not found' })
  res.json(study)
})

router.patch('/:id', async (req, res) => {
  try {
    const updates = {}
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim()
    if (req.body.objective !== undefined) updates.objective = String(req.body.objective).trim()
    if (Array.isArray(req.body.sourceBatchIds)) updates.sourceBatchIds = req.body.sourceBatchIds
    const study = await ResearchStudy.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true })
    if (!study) return res.status(404).json({ error: 'Research study not found' })
    res.json(study)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:id/run', async (req, res) => {
  try {
    res.json(await runStudy(req.params.id, req.user._id))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  const study = await ResearchStudy.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!study) return res.status(404).json({ error: 'Research study not found' })
  res.json({ message: 'Research study deleted' })
})

module.exports = router
