const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')
const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')
const ResearchStudy = require('../models/ResearchStudy')
const { evaluateLocally } = require('../services/localEvalService')

const samples = [
  ['conv-1001', 'Customer: I was charged twice for my subscription.\nAgent: I am sorry about that. I verified the duplicate charge and processed a refund. You will receive confirmation today.'],
  ['conv-1002', 'Customer: Your holiday policy says I have 60 days to return this item.\nAgent: Unfortunately returns are only allowed within 30 days and I cannot help further.'],
  ['conv-1003', 'Customer: The API is returning 429 errors before our limit.\nAgent: I understand the impact. I collected your request ID and escalated this to our API specialist.'],
  ['conv-1004', 'Customer: Please cancel my subscription immediately.\nAgent: I completed the cancellation and sent confirmation to your email.'],
  ['conv-1005', 'Customer: My billing portal has been unavailable since yesterday.\nAgent: Try refreshing the page.'],
  ['conv-1006', 'Customer: Can you explain the enterprise warranty?\nAgent: The warranty covers hardware for three years. I have linked the policy and can connect you with a specialist.']
]

async function seed () {
  await connectDB()

  let user = await User.findOne({ email: 'admin@agentqa.local' })
  if (!user) {
    user = new User({
      email: 'admin@agentqa.local',
      company: 'Agentic QA',
      plan: 'team',
      alertThreshold: 70,
      alertEmail: 'admin@agentqa.local',
      companyPolicy: 'Holiday purchases have a 60-day return window. Billing disputes require account verification. Escalate unresolved technical incidents.'
    })
    await user.setPassword('AgentQA123!')
    await user.save()
  }

  await Conversation.deleteMany({ userId: user._id })
  await Batch.deleteMany({ userId: user._id })
  await ResearchStudy.deleteMany({ userId: user._id })

  const batch = await Batch.create({
    userId: user._id,
    batchName: 'Production Support Baseline',
    name: 'Production Support Baseline',
    status: 'complete',
    totalConversations: samples.length,
    totalCount: samples.length,
    processedCount: samples.length,
    alertThreshold: user.alertThreshold,
    completedAt: new Date()
  })

  const evaluations = samples.map(([externalId, rawText]) => {
    const result = evaluateLocally(rawText, user.companyPolicy)
    return {
      externalId,
      rawText,
      result
    }
  })

  await Conversation.insertMany(evaluations.map(({ externalId, rawText, result }) => ({
    batchId: batch._id,
    userId: user._id,
    externalId,
    rawText,
    accuracyScore: result.accuracy_score,
    policyScore: result.policy_score,
    resolutionScore: result.resolution_score,
    toneScore: result.tone_score,
    escalationScore: result.escalation_score,
    overallScore: result.overall_score,
    issues: result.issues,
    summary: result.summary,
    flagged: result.overall_score < user.alertThreshold,
    evaluatedAt: new Date()
  })))

  const average = field => Math.round(evaluations.reduce((sum, item) => sum + item.result[field], 0) / evaluations.length)
  await Batch.findByIdAndUpdate(batch._id, {
    failedCount: evaluations.filter(item => item.result.overall_score < user.alertThreshold).length,
    avgScore: average('overall_score'),
    avgAccuracy: average('accuracy_score'),
    avgPolicy: average('policy_score'),
    avgResolution: average('resolution_score'),
    avgTone: average('tone_score'),
    avgEscalation: average('escalation_score')
  })

  await ResearchStudy.create({
    userId: user._id,
    title: 'Support quality baseline',
    objective: 'Identify recurring policy and resolution risks.',
    status: 'complete',
    sourceBatchIds: [batch._id],
    confidence: 91,
    summary: 'The baseline identifies policy handling and incomplete resolution as the highest-priority risks.',
    findings: [
      { title: 'Policy conflict risk', evidence: 'Holiday return guidance conflicts with the active policy.', confidence: 94, severity: 'high' },
      { title: 'Incomplete resolution', evidence: 'Technical support response lacked a concrete next step.', confidence: 88, severity: 'medium' }
    ],
    completedAt: new Date()
  })

  console.log('Seed complete')
  console.log('Database:', mongoose.connection.name)
  console.log('Login: admin@agentqa.local / AgentQA123!')
  await mongoose.disconnect()
}

seed().catch(async error => {
  console.error(error)
  await mongoose.disconnect()
  process.exit(1)
})
