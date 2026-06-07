const { getGemini } = require('../config/gemini')
const Conversation = require('../models/Conversation')
const Batch = require('../models/Batch')

const WEIGHTS = {
  accuracy_score: 0.3,
  policy_score: 0.25,
  resolution_score: 0.2,
  tone_score: 0.15,
  escalation_score: 0.1
}

const EVAL_PROMPT = `You are a QA evaluator for AI customer support agents.

Evaluate the conversation and return only valid JSON:
{
  "accuracy_score": 0-100,
  "policy_score": 0-100,
  "resolution_score": 0-100,
  "tone_score": 0-100,
  "escalation_score": 0-100,
  "overall_score": 0-100,
  "issues": ["list of specific problems found"],
  "summary": "one sentence verdict"
}

Scoring criteria:
- Accuracy: Did the agent give correct information?
- Policy Compliance: Did the agent follow company rules?
- Resolution: Was the customer's problem solved?
- Tone and Empathy: Was the agent professional and kind?
- Escalation: Did the agent escalate when needed? Score 100 if escalation was not needed.

Use this weighting for overall_score:
Accuracy 30%, Policy 25%, Resolution 20%, Tone 15%, Escalation 10%.

Company policy context:
{POLICY}

Conversation:
{CONVERSATION}`

function clampScore (value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 50
  return Math.min(100, Math.max(0, Math.round(number)))
}

function extractJson (text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (err) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw err
  }
}

function normalizeEvaluation (payload) {
  const normalized = {
    accuracy_score: clampScore(payload.accuracy_score),
    policy_score: clampScore(payload.policy_score),
    resolution_score: clampScore(payload.resolution_score),
    tone_score: clampScore(payload.tone_score),
    escalation_score: clampScore(payload.escalation_score),
    issues: Array.isArray(payload.issues) ? payload.issues.map(String).slice(0, 10) : [],
    summary: String(payload.summary || '').slice(0, 500)
  }

  normalized.overall_score = clampScore(
    payload.overall_score ??
    Object.entries(WEIGHTS).reduce((sum, [field, weight]) => sum + normalized[field] * weight, 0)
  )

  return normalized
}

async function evaluateOne (rawText, companyPolicy = '') {
  const gemini = getGemini()
  const prompt = EVAL_PROMPT
    .replace('{POLICY}', companyPolicy?.trim() || 'No specific policy provided. Use general customer service best practices.')
    .replace('{CONVERSATION}', String(rawText || '').trim())

  const result = await gemini.generateContent(prompt)
  const parsed = extractJson(result.response.text())
  return normalizeEvaluation(parsed)
}

async function processConversation (conversation, companyPolicy, alertThreshold) {
  const scores = await evaluateOne(conversation.rawText, companyPolicy)
  const flagged = scores.overall_score < alertThreshold

  await Conversation.findByIdAndUpdate(conversation._id, {
    accuracyScore: scores.accuracy_score,
    policyScore: scores.policy_score,
    resolutionScore: scores.resolution_score,
    toneScore: scores.tone_score,
    escalationScore: scores.escalation_score,
    overallScore: scores.overall_score,
    issues: scores.issues,
    summary: scores.summary,
    flagged,
    evaluatedAt: new Date()
  })

  return { scores, flagged }
}

async function processBatch (batchId, conversations, companyPolicy, alertThreshold) {
  const chunkSize = Number(process.env.EVAL_CHUNK_SIZE || 3)
  const chunkDelayMs = Number(process.env.EVAL_CHUNK_DELAY_MS || 1000)

  let processedCount = 0
  let failedCount = 0
  const totals = {
    overall: 0,
    accuracy: 0,
    policy: 0,
    resolution: 0,
    tone: 0,
    escalation: 0
  }

  for (let i = 0; i < conversations.length; i += chunkSize) {
    const chunk = conversations.slice(i, i + chunkSize)

    await Promise.all(chunk.map(async conversation => {
      try {
        const { scores, flagged } = await processConversation(conversation, companyPolicy, alertThreshold)
        totals.overall += scores.overall_score
        totals.accuracy += scores.accuracy_score
        totals.policy += scores.policy_score
        totals.resolution += scores.resolution_score
        totals.tone += scores.tone_score
        totals.escalation += scores.escalation_score
        if (flagged) failedCount += 1
      } catch (err) {
        await Conversation.findByIdAndUpdate(conversation._id, {
          summary: `Evaluation failed: ${err.message}`,
          flagged: true,
          evaluatedAt: new Date()
        })
        failedCount += 1
      }

      processedCount += 1
      await Batch.findByIdAndUpdate(batchId, { processedCount, failedCount })
    }))

    if (i + chunkSize < conversations.length && chunkDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, chunkDelayMs))
    }
  }

  const denominator = processedCount || 1
  const update = {
    status: 'complete',
    processedCount,
    failedCount,
    avgScore: Math.round(totals.overall / denominator),
    avgAccuracy: Math.round(totals.accuracy / denominator),
    avgPolicy: Math.round(totals.policy / denominator),
    avgResolution: Math.round(totals.resolution / denominator),
    avgTone: Math.round(totals.tone / denominator),
    avgEscalation: Math.round(totals.escalation / denominator),
    completedAt: new Date()
  }

  await Batch.findByIdAndUpdate(batchId, update)
  return update
}

module.exports = {
  evaluateOne,
  processBatch,
  normalizeEvaluation
}
