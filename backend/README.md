# AgentQA Backend

Express API for the AgentQA AI support quality and observability platform.

## Structure

```text
backend/
  src/
    app.js
    config/
    middleware/
    models/
    routes/
    services/
  .env.example
  package.json
  sample-conversations.csv
```

## Setup

```bash
cd backend
npm install
copy .env.example .env
```

The default example connects to the local MongoDB service visible in Compass:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=agentic_qa
AI_PROVIDER=local
```

The local AI evaluator and JWT login work without external APIs. Optional integrations:

- `GEMINI_API_KEY`: stronger LLM-based transcript evaluation.
- Firebase Web/Admin credentials: Google sign-in.
- `RESEND_API_KEY`: email quality alerts.
- Stripe secret, webhook secret, and price IDs: paid Checkout and Customer Portal.

Free accounts have access to every product feature and can upload five batch
files per month. Paid plan state is updated only from signed Stripe webhooks.

## Run

```bash
npm run seed
npm run dev
```

Seed login: `admin@agentqa.local` / `AgentQA123!`

Health check:

```bash
curl http://localhost:5000/health
```

## Main Endpoints

```text
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

POST   /api/batches/upload
GET    /api/batches
GET    /api/batches/:id
DELETE /api/batches/:id
GET    /api/batches/:id/export

GET    /api/conversations/:batchId
GET    /api/conversations/:batchId/flagged
GET    /api/conversations/:id

GET    /api/dashboard/stats
GET    /api/dashboard/recent-batches

GET    /api/analysis/overview
GET    /api/analysis/trends
GET    /api/ai/status
POST   /api/ai/evaluate
GET    /api/research
POST   /api/research
POST   /api/research/:id/run
GET    /api/reports/executive
GET    /api/billing/plans
GET    /api/billing/subscription
POST   /api/billing/checkout
POST   /api/billing/portal
POST   /api/billing/webhook

GET    /api/settings
PUT    /api/settings
PUT    /api/settings/threshold
```

## Upload Example

```bash
curl -X POST http://localhost:5000/api/batches/upload ^
  -H "Authorization: Bearer YOUR_JWT" ^
  -F "file=@sample-conversations.csv" ^
  -F "batchName=Demo Batch"
```

## Verify

```bash
npm run check
```
