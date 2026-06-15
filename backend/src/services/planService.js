const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    batchUploadLimit: 5,
    memberLimit: 2,
    evalLimit: 1000000,
    description: 'Explore every AgentQA feature with a monthly file allowance.'
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    batchUploadLimit: 50,
    memberLimit: 5,
    evalLimit: 1000,
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    description: 'For teams establishing a repeatable AI quality program.'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    batchUploadLimit: 250,
    memberLimit: 20,
    evalLimit: 10000,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    description: 'For production teams monitoring multiple AI agents.'
  },
  team: {
    id: 'team',
    name: 'Enterprise',
    monthlyPrice: 499,
    batchUploadLimit: 1000000,
    memberLimit: 1000000,
    evalLimit: 1000000,
    priceId: process.env.STRIPE_PRICE_TEAM || '',
    description: 'For organizations requiring scale, governance, and support.'
  }
}

function getPlan (id = 'free') {
  return PLANS[id] || PLANS.free
}

function publicPlans () {
  return Object.values(PLANS).map(({ priceId, ...plan }) => ({
    ...plan,
    checkoutAvailable: plan.id === 'free' || Boolean(priceId)
  }))
}

function planFromPriceId (priceId) {
  return Object.values(PLANS).find(plan => plan.priceId && plan.priceId === priceId)?.id || 'free'
}

module.exports = { PLANS, getPlan, publicPlans, planFromPriceId }
