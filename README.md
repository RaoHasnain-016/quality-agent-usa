# AgentQA

AgentQA is an AI-powered quality assurance platform for evaluating customer-support conversations. It imports CSV or JSON conversation batches, scores each interaction across multiple quality dimensions, flags risky conversations, supports human review, and turns evaluation data into alerts, research studies, analysis, and stakeholder reports.

## Core Features

- Email/password and Google authentication with Firebase support
- MongoDB-backed users, batches, conversations, alerts, reports, and research
- CSV and JSON batch upload with asynchronous evaluation
- Local evaluation fallback and optional Gemini AI evaluation
- Accuracy, policy, resolution, tone, escalation, and overall scores
- Conversation filtering, review, bulk review, and score overrides
- Live dashboard and conversation polling
- Quality alerts and Resend email notifications
- Research studies, quality analysis, and stakeholder reports
- Workspace members, roles, invitations, themes, settings, and audit logs
- Four usage plans with Stripe Checkout, invoices, and billing portal
- Free-plan access to all features with five batch uploads per month

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Angular 17, TypeScript, RxJS, Firebase Web SDK |
| Backend | Node.js, Express 5, JWT, Firebase Admin |
| Database | MongoDB, Mongoose |
| AI | Gemini API with local evaluation fallback |
| Integrations | Stripe, Resend, Firebase Authentication |
| Security | Helmet, CORS, rate limiting, owner-scoped database queries |

## Architecture

```text
Angular frontend (localhost:4200)
        |
        | REST API + Bearer token
        v
Express backend (localhost:5000)
        |
        +-- MongoDB / MongoDB Compass
        +-- Gemini AI
        +-- Firebase Authentication
        +-- Resend email
        +-- Stripe billing
```

## Project Structure

```text
agentqa-backend/
  backend/
    src/
      app.js                 Express application and route registration
      config/                MongoDB and Firebase configuration
      middleware/            Authentication, database, and upload middleware
      models/                Mongoose data models
      routes/                REST API modules
      services/              Evaluation, alerts, research, plans, and email
      scripts/               Seed and authenticated API smoke tests
    .env.example
    package.json
  frontend/
    src/
      app/
        components/          Application screens
        guards/              Angular route guards
        services/            API, authentication, and theme services
        app.routes.ts        Clean Angular routes
      environments/
    package.json
```

## Main Screens

| Area | Routes |
| --- | --- |
| Public and authentication | `/`, `/login`, `/signup`, `/forgot-password`, `/accept-invite` |
| Onboarding | `/onboarding`, `/onboarding/company`, `/onboarding/threshold` |
| Monitoring | `/dashboard`, `/batches`, `/batches/new`, `/conversations`, `/alerts` |
| Intelligence | `/research`, `/analysis`, `/reports` |
| Workspace | `/settings/*`, `/usage`, `/audit-log`, `/help` |
| Billing | `/pricing`, `/settings/billing` |

The frontend uses clean browser URLs without hash routing.

## REST API Modules

All protected endpoints require:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN_OR_AGENTQA_JWT>
```

| Base URL | Purpose |
| --- | --- |
| `/health` | Backend, database, and integration health |
| `/api/auth` | Signup, login, Firebase session, current user |
| `/api/dashboard` | Dashboard statistics and recent batches |
| `/api/batches` | Upload, list, inspect, export, and delete batches |
| `/api/conversations` | List, filter, review, override, and inspect conversations |
| `/api/ai` | Direct transcript evaluation and AI status |
| `/api/alerts` | Quality alert queue and resolution |
| `/api/research` | Evidence-based quality studies |
| `/api/analysis` | Overview, trends, dimensions, failures, and activity |
| `/api/reports` | Executive snapshots and scheduled reports |
| `/api/settings` | Workspace and evaluation settings |
| `/api/members` | Member invitations, roles, and acceptance |
| `/api/workspace` | Usage, audit logs, help center, and support tickets |
| `/api/billing` | Plans, subscriptions, Stripe Checkout, invoices, and portal |

See [backend/README.md](backend/README.md) for additional backend details.

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection
- Optional provider accounts for Firebase, Gemini, Resend, and Stripe

## Local Setup

### 1. Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

Backend URL: `http://localhost:5000`

Health check: `http://localhost:5000/health`

Seed account:

```text
Email: admin@agentqa.local
Password: AgentQA123!
```

### 2. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:4200`

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure only the integrations you need.

```env
PORT=5000
FRONTEND_URL=http://localhost:4200
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=agentic_qa
JWT_SECRET=<LONG_RANDOM_SECRET>

AI_PROVIDER=local
GEMINI_API_KEY=<OPTIONAL_GEMINI_KEY>

FIREBASE_PROJECT_ID=<OPTIONAL_PROJECT_ID>
FIREBASE_PRIVATE_KEY=<OPTIONAL_PRIVATE_KEY>
FIREBASE_CLIENT_EMAIL=<OPTIONAL_CLIENT_EMAIL>

RESEND_API_KEY=<OPTIONAL_RESEND_KEY>
ALERT_FROM_EMAIL="AgentQA <invites@your-verified-domain.com>"

STRIPE_SECRET_KEY=<OPTIONAL_STRIPE_SECRET>
STRIPE_WEBHOOK_SECRET=<OPTIONAL_WEBHOOK_SECRET>
STRIPE_PRICE_STARTER=<OPTIONAL_PRICE_ID>
STRIPE_PRICE_PRO=<OPTIONAL_PRICE_ID>
STRIPE_PRICE_TEAM=<OPTIONAL_PRICE_ID>
```

Important:

- Never commit `backend/.env`, Firebase service-account JSON, or provider secrets.
- Resend requires a verified sending domain for invitations to arbitrary recipients.
- Stripe subscription state should be updated through signed webhooks in production.

## Conversation Upload Format

The simplest supported CSV format is:

```csv
id,conversation
conv-001,"Customer: My order is late.
Agent: I apologize for the delay. I will check the shipment and update you."
```

Supported CSV transcript columns include `conversation`, `transcript`, and `full_conversation`. Multi-turn CSV rows using `conversation_id`, `role`, and `message` are also supported.

## Plans and Limits

| Plan | Monthly Price | Batch Files | Members | Evaluations |
| --- | ---: | ---: | ---: | ---: |
| Free | $0 | 5 | 2 | 1,000,000 |
| Starter | $49 | 50 | 5 | 1,000 |
| Pro | $149 | 250 | 20 | 10,000 |
| Enterprise | $499 | Unlimited | Unlimited | Unlimited |

During the testing phase, the Free plan can access every feature but is limited to five uploaded batch files per month.

## Verification

Backend syntax checks:

```powershell
cd backend
npm test
```

Authenticated REST API smoke test:

```powershell
cd backend
npm run smoke
```

The smoke test checks 28 application endpoints using the seeded account.

Frontend production build:

```powershell
cd frontend
npm run build
```

## Security Notes

- Authentication supports Firebase ID tokens and local AgentQA JWTs.
- Database queries are scoped to the authenticated user/workspace owner.
- Helmet, CORS rules, request-size limits, file restrictions, and rate limiting are enabled.
- Secrets, logs, dependencies, caches, and build output are excluded through `.gitignore`.
- Rotate any credential that has previously been shared publicly.

## Current Limitations

- Live data uses polling rather than WebSockets.
- Production Firebase, Resend, Gemini, and Stripe behavior requires valid provider configuration.
- Resend test senders cannot deliver invitations to arbitrary recipients.
- Advanced organization-level role authorization can be expanded further.
- Production deployment and monitoring configuration are environment-specific.

## Contact

- Email: `hasnain.devconnect@gmail.com`
- Phone: `+923046838346`
- Office: Agentic QA Office, Multan Road, Vehari

## License

Copyright (c) 2026 AgentQA. All rights reserved.
