const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const { evaluateOne } = require('../services/evalService')

router.use(authMiddleware)

router.get('/status', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_KEY_HERE'))
  res.json({
    provider: hasGemini && process.env.AI_PROVIDER !== 'local' ? 'gemini' : 'local',
    geminiConfigured: hasGemini,
    localEvaluatorAvailable: true,
    model: hasGemini ? process.env.GEMINI_MODEL : 'local-evidence-evaluator'
  })
})

router.post('/evaluate', async (req, res) => {
  try {
    const transcript = String(req.body.transcript || req.body.rawText || '').trim()
    if (transcript.length < 10) return res.status(400).json({ error: 'Transcript must be at least 10 characters' })
    const result = await evaluateOne(transcript, req.body.companyPolicy || req.user.companyPolicy)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
