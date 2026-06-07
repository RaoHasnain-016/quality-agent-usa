const jwt = require('jsonwebtoken')
const router = require('express').Router()
const admin = require('../config/firebase')
const authMiddleware = require('../middleware/auth')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function signToken (user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

function requireEmailPassword (req, res) {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' })
    return null
  }

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return null
  }

  return { email, password }
}

router.post('/signup', async (req, res) => {
  try {
    const credentials = requireEmailPassword(req, res)
    if (!credentials) return

    const existing = await User.findOne({ email: credentials.email })
    if (existing) return res.status(409).json({ error: 'Email is already registered' })

    let firebaseUid = ''
    if (admin) {
      const firebaseUser = await admin.auth().createUser({
        email: credentials.email,
        password: credentials.password,
        emailVerified: false
      })
      firebaseUid = firebaseUser.uid
    }

    const user = new User({
      firebaseUid: firebaseUid || undefined,
      email: credentials.email,
      company: String(req.body.company || '').trim(),
      plan: 'free'
    })
    await user.setPassword(credentials.password)
    await user.save()

    res.status(201).json({
      token: signToken(user),
      user: user.toSafeJSON()
    })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email is already registered' })
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const credentials = requireEmailPassword(req, res)
    if (!credentials) return

    const user = await User.findOne({ email: credentials.email })
    if (!user || !(await user.comparePassword(credentials.password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    await user.resetMonthlyUsageIfNeeded()
    res.json({
      token: signToken(user),
      user: user.toSafeJSON()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/firebase-session', authMiddleware, async (req, res) => {
  res.json({
    token: signToken(req.user),
    user: req.user.toSafeJSON()
  })
})

router.get('/me', authMiddleware, async (req, res) => {
  res.json(req.user.toSafeJSON())
})

module.exports = router
