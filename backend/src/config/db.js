const mongoose = require('mongoose')

async function connectDB () {
  const uri = process.env.MONGODB_URI
  if (!uri || uri.includes('USERNAME:PASSWORD')) {
    console.warn('MongoDB URI is not configured. Database-backed API routes will be unavailable.')
    return null
  }

  try {
    const connection = await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'agentqa',
      serverSelectionTimeoutMS: 10000
    })
    console.log(`MongoDB connected: ${connection.connection.host}`)
    return connection
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    if (process.env.NODE_ENV === 'production') process.exit(1)
    return null
  }
}

module.exports = connectDB
