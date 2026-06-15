const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')
const Report = require('../models/Report')
const ResearchStudy = require('../models/ResearchStudy')
const WorkspaceMember = require('../models/WorkspaceMember')
const AuditLog = require('../models/AuditLog')
const SupportTicket = require('../models/SupportTicket')
const { getPlan } = require('../services/planService')
const { logActivity } = require('../services/auditService')

router.use(authMiddleware)

router.get('/usage', async (req, res) => {
  const userId = req.user._id
  const since = new Date()
  since.setDate(1)
  since.setHours(0, 0, 0, 0)
  const plan = getPlan(req.user.plan)
  const [batches, conversations, flagged, reviewed, reports, studies, members, daily] = await Promise.all([
    Batch.countDocuments({ userId }),
    Conversation.countDocuments({ userId }),
    Conversation.countDocuments({ userId, flagged: true }),
    Conversation.countDocuments({ userId, reviewed: true }),
    Report.countDocuments({ userId }),
    ResearchStudy.countDocuments({ userId }),
    WorkspaceMember.countDocuments({ ownerId: userId, status: { $in: ['pending', 'active'] } }),
    Conversation.aggregate([
      { $match: { userId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, evaluations: { $sum: 1 }, flagged: { $sum: { $cond: ['$flagged', 1, 0] } } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', evaluations: 1, flagged: 1 } }
    ])
  ])
  res.json({
    plan,
    resetsAt: req.user.usageResetAt,
    quotas: {
      files: { used: req.user.batchUploadsUsed, limit: req.user.batchUploadLimit },
      evaluations: { used: req.user.evalUsed, limit: req.user.evalLimit },
      members: { used: members, limit: plan.memberLimit }
    },
    totals: { batches, conversations, flagged, reviewed, reports, studies },
    daily
  })
})

router.get('/audit', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)))
  const filter = { userId: req.user._id }
  if (req.query.category) filter.category = req.query.category
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter)
  ])
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

router.get('/support', async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20)
  res.json({
    contact: { email: 'hasnain.devconnect@gmail.com', phone: '+923046838346', address: 'Agentic QA Office, Multan Road, Vehari' },
    tickets,
    articles: [
      { id: 'upload', category: 'Getting started', title: 'Prepare and upload a conversation batch', detail: 'CSV and JSON batch requirements, validation, and quota behavior.' },
      { id: 'scores', category: 'Evaluations', title: 'Understand quality scores and flagged issues', detail: 'How AgentQA calculates dimensions, failures, and review priority.' },
      { id: 'members', category: 'Workspace', title: 'Invite members and assign roles', detail: 'Manage plan limits, pending invitations, and workspace access.' },
      { id: 'billing', category: 'Billing', title: 'Manage subscriptions and invoices securely', detail: 'Stripe checkout, billing portal, upgrades, and cancellations.' },
      { id: 'security', category: 'Security', title: 'Authentication and data isolation', detail: 'Firebase identity, bearer tokens, and owner-scoped MongoDB records.' },
      { id: 'integrations', category: 'Integrations', title: 'Configure Gemini, Resend, Firebase, and Stripe', detail: 'Required environment configuration and health checks.' }
    ]
  })
})

router.post('/support/tickets', async (req, res) => {
  const subject = String(req.body.subject || '').trim()
  const message = String(req.body.message || '').trim()
  if (subject.length < 4 || message.length < 10) return res.status(400).json({ error: 'Provide a subject and a detailed support message.' })
  const ticket = await SupportTicket.create({
    userId: req.user._id,
    subject,
    message,
    category: req.body.category,
    priority: req.body.priority
  })
  await logActivity(req, 'Support ticket created', 'support', ticket._id.toString(), subject)
  res.status(201).json(ticket)
})

module.exports = router
