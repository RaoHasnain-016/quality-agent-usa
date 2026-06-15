const API_URL = process.env.API_URL || 'http://localhost:5000'
const email = process.env.SMOKE_EMAIL || 'admin@agentqa.local'
const password = process.env.SMOKE_PASSWORD || 'AgentQA123!'

const endpoints = [
  '/health',
  '/api/auth/me',
  '/api/dashboard/stats',
  '/api/dashboard/recent-batches',
  '/api/batches',
  '/api/conversations',
  '/api/conversations/summary',
  '/api/alerts',
  '/api/alerts/summary',
  '/api/research',
  '/api/research/summary',
  '/api/analysis/overview',
  '/api/analysis/trends',
  '/api/analysis/distribution',
  '/api/analysis/failures',
  '/api/analysis/batches',
  '/api/analysis/activity',
  '/api/reports',
  '/api/reports/summary',
  '/api/reports/executive',
  '/api/members',
  '/api/workspace/usage',
  '/api/workspace/audit',
  '/api/workspace/support',
  '/api/settings',
  '/api/billing/plans',
  '/api/billing/subscription',
  '/api/billing/invoices'
]

async function request (path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const text = await response.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {}
  return { response, body }
}

async function run () {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const loginBody = await login.json()
  if (!login.ok || !loginBody.token) {
    throw new Error(`Login failed (${login.status}): ${loginBody.error || 'No token returned'}`)
  }

  let failures = 0
  for (const endpoint of endpoints) {
    const { response, body } = await request(endpoint, endpoint === '/health' || endpoint === '/api/billing/plans' ? '' : loginBody.token)
    const status = response.ok ? 'PASS' : 'FAIL'
    console.log(`${status} ${response.status} ${endpoint}`)
    if (!response.ok) {
      failures += 1
      console.log(`  ${body.error || JSON.stringify(body)}`)
    }
  }

  if (failures) throw new Error(`${failures} API smoke check(s) failed`)
  console.log(`All ${endpoints.length} API smoke checks passed.`)
}

run().catch(error => {
  const detail = error.cause?.message ? `: ${error.cause.message}` : ''
  console.error(`${error.message}${detail}`)
  process.exit(1)
})
