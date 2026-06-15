const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('YOUR_KEY_HERE')
  ? new Resend(process.env.RESEND_API_KEY)
  : null

function escapeHtml (value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendMemberInvite (owner, member) {
  if (!resend) {
    return { sent: false, error: 'Resend API key is not configured.' }
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '')
  const inviteUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(member.inviteToken)}`
  const workspace = escapeHtml(owner.company || 'AgentQA workspace')
  const inviter = escapeHtml(owner.displayName || owner.email)

  const result = await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL || 'AgentQA <alerts@agentqa.io>',
    to: member.email,
    subject: `You have been invited to ${owner.company || 'AgentQA'}`,
    html: `
      <!doctype html>
      <html><body style="margin:0;padding:32px;background:#07111e;color:#e7edf8;font-family:Arial,sans-serif">
        <div style="max-width:560px;margin:auto;border:1px solid #273548;background:#101a29;padding:32px">
          <p style="margin:0 0 8px;color:#4cd7f6;font-weight:700;letter-spacing:.08em">AGENTQA WORKSPACE INVITATION</p>
          <h1 style="margin:0 0 16px;font-size:28px">Join ${workspace}</h1>
          <p style="color:#aebaca;line-height:1.65">${inviter} invited you as a <strong style="color:#e7edf8">${escapeHtml(member.role)}</strong>. Accept the invitation to collaborate on evaluations, reviews, and quality reports.</p>
          <a href="${inviteUrl}" style="display:block;margin-top:24px;background:#4cd7f6;color:#00141c;padding:14px;text-align:center;text-decoration:none;font-weight:700">Accept invitation</a>
          <p style="margin:24px 0 0;color:#718096;font-size:12px">If you were not expecting this invitation, you can ignore this email.</p>
        </div>
      </body></html>`
  })

  if (result.error) {
    return {
      sent: false,
      error: result.error.message || 'Resend rejected the invitation email.'
    }
  }

  return { sent: Boolean(result.data?.id), id: result.data?.id || null }
}

module.exports = { sendMemberInvite }
