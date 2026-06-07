const mongoose = require('mongoose')

function hasMongoUri () {
  const uri = process.env.MONGODB_URI
  return Boolean(uri && !uri.includes('USERNAME:PASSWORD'))
}

function requireDb (req, res, next) {
  if (!hasMongoUri()) {
    return res.status(503).json({ error: 'MongoDB is not configured' })
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB is not connected' })
  }

  next()
}

module.exports = requireDb
