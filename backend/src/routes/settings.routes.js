const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const User = require('../models/User')

router.use(authMiddleware)

function parseThreshold (value) {
  const threshold = Number(value)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error('alertThreshold must be between 0 and 100')
  }
  return Math.round(threshold)
}

router.get('/', async (req, res) => {
  res.json(req.user.toSafeJSON())
})

router.put('/', async (req, res) => {
  try {
    const updates = {}

    if (req.body.company !== undefined) updates.company = String(req.body.company).trim()
    if (req.body.alertEmail !== undefined) updates.alertEmail = String(req.body.alertEmail).trim()
    if (req.body.companyPolicy !== undefined) updates.companyPolicy = String(req.body.companyPolicy).trim()
    if (req.body.alertThreshold !== undefined) updates.alertThreshold = parseThreshold(req.body.alertThreshold)

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
    res.json(user.toSafeJSON())
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/threshold', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { alertThreshold: parseThreshold(req.body.alertThreshold ?? req.body.threshold) },
      { new: true, runValidators: true }
    )
    res.json({ alertThreshold: user.alertThreshold })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
