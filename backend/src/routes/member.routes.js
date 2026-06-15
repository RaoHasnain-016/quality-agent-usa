const crypto = require('crypto')
const router = require('express').Router()
const authMiddleware = require('../middleware/auth')
const WorkspaceMember = require('../models/WorkspaceMember')
const { getPlan } = require('../services/planService')
const { sendMemberInvite } = require('../services/inviteService')
const { logActivity } = require('../services/auditService')

router.use(authMiddleware)

function token () {
  return crypto.randomBytes(32).toString('hex')
}

async function usageFor (user) {
  const plan = getPlan(user.plan)
  const used = await WorkspaceMember.countDocuments({ ownerId: user._id, status: { $in: ['pending', 'active'] } })
  return {
    plan: plan.id,
    planName: plan.name,
    used,
    limit: plan.memberLimit,
    remaining: Math.max(0, plan.memberLimit - used)
  }
}

router.get('/', async (req, res) => {
  const [members, usage] = await Promise.all([
    WorkspaceMember.find({ ownerId: req.user._id, status: { $ne: 'revoked' } }).sort({ createdAt: -1 }),
    usageFor(req.user)
  ])
  res.json({ members, usage })
})

router.post('/accept', async (req, res) => {
  const inviteToken = String(req.body.token || '').trim()
  const member = await WorkspaceMember.findOne({ inviteToken, status: 'pending' })
  if (!member) return res.status(404).json({ error: 'Invitation is invalid or has already been accepted.' })
  if (member.email !== req.user.email) return res.status(403).json({ error: 'Sign in with the email address that received this invitation.' })
  member.status = 'active'
  member.joinedAt = new Date()
  await member.save()
  res.json({ member })
})

router.post('/invite', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const role = String(req.body.role || 'reviewer').toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid member email address.' })
    if (email === req.user.email) return res.status(400).json({ error: 'The workspace owner is already a member.' })
    if (!['admin', 'analyst', 'reviewer', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid workspace role.' })

    const existing = await WorkspaceMember.findOne({ ownerId: req.user._id, email })
    const usage = await usageFor(req.user)
    if (!existing && usage.used >= usage.limit) {
      return res.status(403).json({ error: `${usage.planName} plan supports ${usage.limit} invited members. Upgrade to invite more.`, code: 'MEMBER_LIMIT_REACHED', usage })
    }

    const member = await WorkspaceMember.findOneAndUpdate(
      { ownerId: req.user._id, email },
      {
        name: String(req.body.name || '').trim(),
        role,
        status: 'pending',
        inviteToken: token(),
        invitedAt: new Date(),
        lastInviteSentAt: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    )

    let delivery = { sent: false, error: 'Email delivery is not configured.' }
    try {
      delivery = await sendMemberInvite(req.user, member)
    } catch (err) {
      console.error('Member invitation email failed:', err.message)
      delivery = { sent: false, error: err.message }
    }

    await logActivity(req, existing ? 'Member invitation updated' : 'Member invited', 'member', member.email, member.role)
    res.status(existing ? 200 : 201).json({
      member,
      emailSent: delivery.sent,
      emailError: delivery.error || '',
      usage: await usageFor(req.user)
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/:id', async (req, res) => {
  const role = String(req.body.role || '').toLowerCase()
  if (!['admin', 'analyst', 'reviewer', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid workspace role.' })
  const member = await WorkspaceMember.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id, status: { $ne: 'revoked' } },
    { role },
    { new: true, runValidators: true }
  )
  if (!member) return res.status(404).json({ error: 'Member not found.' })
  await logActivity(req, 'Member role changed', 'member', member.email, role)
  res.json({ member })
})

router.post('/:id/resend', async (req, res) => {
  const member = await WorkspaceMember.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id, status: 'pending' },
    { inviteToken: token(), lastInviteSentAt: new Date() },
    { new: true }
  )
  if (!member) return res.status(404).json({ error: 'Pending invitation not found.' })
  let delivery = { sent: false, error: 'Email delivery is not configured.' }
  try {
    delivery = await sendMemberInvite(req.user, member)
  } catch (err) {
    console.error('Member invitation email failed:', err.message)
    delivery = { sent: false, error: err.message }
  }
  res.json({ member, emailSent: delivery.sent, emailError: delivery.error || '' })
})

router.delete('/:id', async (req, res) => {
  const member = await WorkspaceMember.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id })
  if (!member) return res.status(404).json({ error: 'Member not found.' })
  await logActivity(req, 'Member removed', 'member', member.email, member.role)
  res.json({ deleted: true, usage: await usageFor(req.user) })
})

module.exports = router
