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

Fill these values in `.env`:

```env
MONGODB_URI=...
JWT_SECRET=...
GEMINI_API_KEY=...
```

Firebase Admin and Resend are optional. If they are missing, JWT auth still works and email alerts are skipped.

## Run

```bash
npm run dev
```

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
