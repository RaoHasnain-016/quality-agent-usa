const router = require('express').Router()
const Stripe = require('stripe')
const authMiddleware = require('../middleware/auth')
const User = require('../models/User')
const { PLANS, getPlan, publicPlans, planFromPriceId } = require('../services/planService')
const { logActivity } = require('../services/auditService')

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

function requireStripe (req, res, next) {
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured yet.' })
  next()
}

router.get('/plans', (req, res) => {
  res.json({ plans: publicPlans(), stripeConfigured: Boolean(stripe) })
})

router.get('/subscription', authMiddleware, async (req, res) => {
  await req.user.resetMonthlyUsageIfNeeded()
  res.json({
    plan: getPlan(req.user.plan),
    usage: {
      filesUsed: req.user.batchUploadsUsed,
      fileLimit: req.user.batchUploadLimit,
      evaluationsUsed: req.user.evalUsed,
      evaluationLimit: req.user.evalLimit,
      resetsAt: req.user.usageResetAt
    },
    subscriptionStatus: req.user.subscriptionStatus,
    currentPeriodEnd: req.user.subscriptionCurrentPeriodEnd,
    stripeConfigured: Boolean(stripe)
  })
})

router.get('/invoices', authMiddleware, async (req, res) => {
  if (!stripe || !req.user.stripeCustomerId) return res.json({ invoices: [] })
  try {
    const result = await stripe.invoices.list({ customer: req.user.stripeCustomerId, limit: 12 })
    res.json({
      invoices: result.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: new Date(invoice.created * 1000),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf
      }))
    })
  } catch (error) {
    console.error('Stripe invoice retrieval failed:', error.message)
    res.json({
      invoices: [],
      warning: 'Stripe invoice history is temporarily unavailable. Please try again shortly.'
    })
  }
})

router.post('/checkout', authMiddleware, requireStripe, async (req, res) => {
  try {
    const plan = PLANS[String(req.body.plan || '').toLowerCase()]
    if (!plan) return res.status(400).json({ error: 'Select a valid AgentQA plan.' })
    if (plan.id === 'free') return res.status(400).json({ error: 'The Free plan does not require payment. Manage paid-plan cancellation in Stripe Billing Portal.' })
    if (!plan.priceId) return res.status(503).json({ error: `${plan.name} Stripe price is not configured.` })

    let customerId = req.user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.company || undefined,
        metadata: { userId: req.user._id.toString() }
      })
      customerId = customer.id
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: customerId })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=cancelled`,
      client_reference_id: req.user._id.toString(),
      metadata: { userId: req.user._id.toString(), plan: plan.id },
      subscription_data: { metadata: { userId: req.user._id.toString(), plan: plan.id } },
      allow_promotion_codes: true
    })
    await logActivity(req, 'Stripe checkout started', 'billing', plan.id, `${plan.name} plan`)
    res.json({ url: session.url })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/checkout/confirm', authMiddleware, requireStripe, async (req, res) => {
  try {
    const sessionId = String(req.body.sessionId || '')
    if (!sessionId.startsWith('cs_')) return res.status(400).json({ error: 'Invalid Stripe Checkout session.' })
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    if (session.client_reference_id !== req.user._id.toString()) return res.status(403).json({ error: 'This checkout session belongs to another account.' })
    if (session.payment_status !== 'paid' && session.status !== 'complete') return res.status(409).json({ error: 'Stripe payment is not complete yet.' })
    if (!session.subscription || typeof session.subscription === 'string') return res.status(409).json({ error: 'Stripe subscription is still being prepared.' })
    await applySubscription(session.subscription)
    await logActivity(req, 'Stripe checkout confirmed', 'billing', session.metadata?.plan || '', session.id)
    const user = await User.findById(req.user._id)
    res.json({ user: user.toSafeJSON(), plan: getPlan(user.plan) })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/portal', authMiddleware, requireStripe, async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer exists for this account.' })
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`
    })
    await logActivity(req, 'Billing portal opened', 'billing', req.user.stripeCustomerId)
    res.json({ url: session.url })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

async function applySubscription (subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id
  const active = ['active', 'trialing', 'past_due'].includes(subscription.status)
  const userId = subscription.metadata?.userId
  const filter = userId ? { _id: userId } : { stripeCustomerId: subscription.customer }
  const user = await User.findOne(filter)
  if (!user) return

  user.plan = active ? (subscription.metadata?.plan || planFromPriceId(priceId)) : 'free'
  user.stripeCustomerId = subscription.customer
  user.stripeSubscriptionId = subscription.id
  user.subscriptionStatus = subscription.status
  user.subscriptionCurrentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null
  await user.save()
}

async function webhook (req, res) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Stripe webhook is not configured.')
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`)
  }

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await applySubscription(event.data.object)
    }
    res.json({ received: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

router.webhook = webhook
module.exports = router
