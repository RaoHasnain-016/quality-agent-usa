const Conversation = require('../models/Conversation')
const ResearchStudy = require('../models/ResearchStudy')

async function runStudy (studyId, userId) {
  const study = await ResearchStudy.findOne({ _id: studyId, userId })
  if (!study) throw new Error('Research study not found')

  study.status = 'running'
  await study.save()

  const filter = { userId, evaluatedAt: { $ne: null } }
  if (study.sourceBatchIds.length) filter.batchId = { $in: study.sourceBatchIds }

  const conversations = await Conversation.find(filter).select('issues overallScore policyScore resolutionScore toneScore escalationScore')
  const issueCounts = new Map()
  conversations.forEach(conversation => {
    conversation.issues.forEach(issue => issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1))
  })

  const findings = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({
      title,
      evidence: `${count} of ${conversations.length} evaluated conversations contain this signal.`,
      confidence: Math.min(99, Math.round(60 + (count / Math.max(1, conversations.length)) * 100)),
      severity: count / Math.max(1, conversations.length) > 0.25 ? 'high' : 'medium'
    }))

  study.findings = findings
  study.confidence = findings.length
    ? Math.round(findings.reduce((sum, finding) => sum + finding.confidence, 0) / findings.length)
    : 0
  study.summary = findings.length
    ? `Research identified ${findings.length} recurring quality patterns across ${conversations.length} conversations.`
    : `No recurring quality patterns were found across ${conversations.length} conversations.`
  study.sampleSize = conversations.length
  study.status = 'complete'
  study.completedAt = new Date()
  await study.save()
  return study
}

module.exports = { runStudy }
