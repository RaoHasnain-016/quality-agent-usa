const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('YOUR_KEY_HERE')
  ? new Resend(process.env.RESEND_API_KEY)
  : null

function scoreColor (score) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function dimensionRow (label, score) {
  return `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #1e293b;">${label}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #1e293b;font-weight:bold;color:${scoreColor(score)}">${score}/100</td>
    </tr>`
}

async function sendQualityAlert (user, batch) {
  if (!resend) {
    console.warn('Resend API key is not configured. Skipping quality alert email.')
    return false
  }

  const toEmail = user.alertEmail || user.email
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4300'
  const batchUrl = `${frontendUrl.replace(/\/$/, '')}/#/batches/${batch._id}`

  const html = `
    <!doctype html>
    <html>
      <body style="background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif;margin:0;padding:24px;">
        <div style="max-width:560px;margin:0 auto;">
          <div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
            <h2 style="color:#f59e0b;margin:0 0 8px;">Quality Alert</h2>
            <p style="margin:0;color:#94a3b8;">Batch: <strong style="color:#e2e8f0">${batch.batchName}</strong></p>
          </div>
          <div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
            <p style="margin:0 0 16px;font-size:18px;">
              Average score
              <span style="color:${scoreColor(batch.avgScore)};font-size:28px;font-weight:bold;">${batch.avgScore}/100</span>
              is below your threshold of <strong>${batch.alertThreshold}</strong>.
            </p>
            <p style="margin:0;color:#94a3b8;">${batch.failedCount} of ${batch.totalConversations} conversations were flagged.</p>
          </div>
          <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            <tbody>
              ${dimensionRow('Accuracy', batch.avgAccuracy)}
              ${dimensionRow('Policy', batch.avgPolicy)}
              ${dimensionRow('Resolution', batch.avgResolution)}
              ${dimensionRow('Tone', batch.avgTone)}
              ${dimensionRow('Escalation', batch.avgEscalation)}
            </tbody>
          </table>
          <a href="${batchUrl}" style="display:block;background:#0891b2;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;">
            View Full Report
          </a>
        </div>
      </body>
    </html>`

  await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL || 'AgentQA Alerts <alerts@agentqa.io>',
    to: toEmail,
    subject: `Quality Alert: ${batch.batchName} scored ${batch.avgScore}/100`,
    html
  })

  return true
}

async function checkAndSend (batchId) {
  const Batch = require('../models/Batch')
  const User = require('../models/User')

  const batch = await Batch.findById(batchId)
  if (!batch || batch.alertSent || batch.avgScore >= batch.alertThreshold) return false

  const user = await User.findById(batch.userId)
  if (!user) return false

  const sent = await sendQualityAlert(user, batch)
  if (sent) await Batch.findByIdAndUpdate(batchId, { alertSent: true })
  return sent
}

module.exports = { checkAndSend, sendQualityAlert }
