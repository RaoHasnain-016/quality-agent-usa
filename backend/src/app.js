const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const connectDB = require('./config/db')
const requireDb = require('./middleware/requireDb')

const app = express()

const dbReady = connectDB()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:4200',
  'http://localhost:4300',
  'http://127.0.0.1:4300'
].filter(Boolean)

function isAllowedOrigin (origin) {
  if (!origin || allowedOrigins.includes(origin)) return true
  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  }
  return false
}

app.use(helmet({
  contentSecurityPolicy: false
}))

app.use(cors({
  origin (origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true)
    callback(new Error(`CORS blocked origin: ${origin}`))
  },
  credentials: true
}))

const billingRoutes = require('./routes/billing.routes')
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRoutes.webhook)

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  message: { error: 'Too many requests, please try again later.' }
}))

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    databaseName: require('mongoose').connection.name || process.env.MONGODB_DB || null,
    aiProvider: process.env.AI_PROVIDER || 'auto',
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      firebase: Boolean(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY)
    },
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  })
})

app.use('/api', requireDb)

app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/batches', require('./routes/batch.routes'))
app.use('/api/conversations', require('./routes/conversation.routes'))
app.use('/api/dashboard', require('./routes/dashboard.routes'))
app.use('/api/settings', require('./routes/settings.routes'))
app.use('/api/members', require('./routes/member.routes'))
app.use('/api/workspace', require('./routes/workspace.routes'))
app.use('/api/ai', require('./routes/ai.routes'))
app.use('/api/research', require('./routes/research.routes'))
app.use('/api/analysis', require('./routes/analysis.routes'))
app.use('/api/alerts', require('./routes/alert.routes'))
app.use('/api/reports', require('./routes/report.routes'))
app.use('/api/billing', billingRoutes)

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'agentqa-frontend')
app.use(express.static(frontendDistPath))
app.use((req, res, next) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'), err => {
    if (err) next()
  })
})

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.message || 'Internal server error'
  })
})

if (require.main === module) {
  const PORT = process.env.PORT || 5000
  dbReady.finally(() => app.listen(PORT, () => {
    console.log(`AgentQA backend running on port ${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/health`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  }))
}

module.exports = app
