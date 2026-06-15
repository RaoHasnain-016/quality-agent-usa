const POLICY_TERMS = ['policy', 'refund', 'return', 'warranty', 'privacy', 'billing', 'subscription']
const ESCALATION_TERMS = ['manager', 'supervisor', 'escalate', 'specialist', 'human agent']
const EMPATHY_TERMS = ['sorry', 'understand', 'appreciate', 'happy to help', 'apologize']
const RESOLUTION_TERMS = ['resolved', 'completed', 'fixed', 'processed', 'next step', 'solution']
const RISK_TERMS = ['cannot', "can't", 'unfortunately', 'not possible', 'denied', 'refuse']

function occurrences (text, terms) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0)
}

function score (value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function evaluateLocally (rawText, companyPolicy = '') {
  const text = String(rawText || '').toLowerCase()
  const policy = String(companyPolicy || '').toLowerCase()
  const agentText = text.split(/\n/).filter(line => /agent|assistant|bot/.test(line)).join(' ')
  const target = agentText || text
  const issues = []

  const risk = occurrences(target, RISK_TERMS)
  const empathy = occurrences(target, EMPATHY_TERMS)
  const resolution = occurrences(target, RESOLUTION_TERMS)
  const escalation = occurrences(target, ESCALATION_TERMS)
  const policyHits = occurrences(target, POLICY_TERMS)
  const questionAnswered = target.length > 80

  const accuracyScore = score(82 + (questionAnswered ? 8 : -18) - risk * 6)
  const policyScore = score(88 + policyHits * 2 - (policy && risk ? 28 : 0) - risk * 7)
  const resolutionScore = score(58 + resolution * 18 - risk * 12 + (questionAnswered ? 8 : 0))
  const toneScore = score(66 + empathy * 16 - risk * 7)
  const escalationScore = score(risk > 0 ? 45 + escalation * 35 : 92)

  if (policyScore < 65) issues.push('Potential policy conflict detected in the agent response.')
  if (resolutionScore < 65) issues.push('The conversation may have ended without a complete resolution.')
  if (toneScore < 65) issues.push('The response may not acknowledge the customer concern empathetically.')
  if (escalationScore < 65) issues.push('Escalation should be considered for this interaction.')
  if (!issues.length) issues.push('No material quality issue detected by the local evaluator.')

  const overallScore = score(
    accuracyScore * 0.3 +
    policyScore * 0.25 +
    resolutionScore * 0.2 +
    toneScore * 0.15 +
    escalationScore * 0.1
  )

  return {
    accuracy_score: accuracyScore,
    policy_score: policyScore,
    resolution_score: resolutionScore,
    tone_score: toneScore,
    escalation_score: escalationScore,
    overall_score: overallScore,
    issues,
    summary: overallScore >= 80
      ? 'The interaction is generally reliable and meets the expected quality standard.'
      : 'The interaction contains quality risks that should be reviewed by the QA team.',
    provider: 'local-evidence-evaluator'
  }
}

module.exports = { evaluateLocally }
