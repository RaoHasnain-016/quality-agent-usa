const jwt = require('jsonwebtoken')
const admin = require('../config/firebase')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'

async function findOrCreateFirebaseUser (decoded) {
  const email = decoded.email?.toLowerCase()
  if (!email) throw new Error('Firebase token does not include email')

  let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email }] })
  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      email,
      company: decoded.name || '',
      plan: 'free'
    })
  } else {
    user.firebaseUid = user.firebaseUid || decoded.uid
    if (!user.company && decoded.name) user.company = decoded.name
    await user.save()
  }

  return user
}

async function authMiddleware (req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.slice('Bearer '.length).trim()
    let user

    if (admin) {
      try {
        const decoded = await admin.auth().verifyIdToken(token)
        user = await findOrCreateFirebaseUser(decoded)
      } catch (firebaseError) {
        user = null
      }
    }

    if (!user) {
      const decoded = jwt.verify(token, JWT_SECRET)
      user = await User.findById(decoded.sub)
    }

    if (!user) return res.status(401).json({ error: 'User not found' })

    await user.resetMonthlyUsageIfNeeded()
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
