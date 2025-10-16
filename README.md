<!--
  Master README for BitNBuild-25_GRIND (TaxWise)
  Combines Frontend, Backend, TaxWise Voice (Twilio), and Chrome Extension docs
  Generated to provide a single source-of-truth for developers and operators.
-->
# TaxWise — Full Project (Frontend + Backend + Voice + Chrome Extension)

This repository contains the full TaxWise project: a React frontend (dashboard and marketing UI), a Node.js backend (Aadhaar-based auth, KYC, transaction ingestion, tax calculations), a TaxWise Voice service (Twilio + VAPI voice agent + alerts), and a small Chrome extension.

This single README explains how the pieces fit together, how data and requests flow through the system, how to run each component locally (PowerShell commands), the required environment variables, important endpoints to configure in Twilio/VAPI, and detailed troubleshooting guidance.

Audience: developers and devops engineers who will run, test, or extend the system locally or deploy to staging/production.

---

## Table of contents

1. High-level architecture
2. Sequence flows (calls, data, alerts) — diagrams and step-by-step
3. Component breakdown
   - Frontend
   - Backend
   - TaxWise Voice
   - Chrome extension
4. Environment & configuration (per-service)
5. How to run everything locally (PowerShell-friendly)
6. Important endpoints & what to configure in Twilio/VAPI
7. Troubleshooting (detailed) and common gotchas
8. Testing, seeding & developer workflows
9. Security & production hardening checklist
10. Next steps & recommended improvements

---

## 1) High-level architecture

Legend:
- UI → Frontend (React + Vite)
- API → Backend (Express + MongoDB)
- Voice → taxwise-voice (Express + Twilio + VAPI)
- Extension → Chrome extension (React + Vite)

ASCII overview (end-to-end):

```
  [User Browser]           [Twilio Cloud]            [VAPI Agent]        [MongoDB]
       |                        |                        |                  |
       |---(1) UI actions-----> |                        |                  |
       |                        |---(2) Webhook (voice)-> |                  |
       |                        |<--(6) Twiml/Bridge -----|                  |
       |                        |                        |                  |
       |---(3) API calls----->  |                        |                  |
       |         (VITE_API_URL) |                        |                  |
       |                        |                        |                  |
       |                        |                        |---(4) Queries--->|
       |                        |                        |<--(5) Data--------|
```

Short flow explanation:
- (1) Users interact with the Frontend. Actions like "Call me" or "Get my CIBIL" trigger API calls.
- (2) Incoming voice calls land on Twilio, which sends a webhook to the `taxwise-voice` service.
- (3) Frontend talks to Backend API for user data, uploads and calculations.
- (4)-(5) VAPI agent calls the secure tool endpoint (`/vapi/tool/query`) on `taxwise-voice`, which may query the Backend/MongoDB for user data.
- (6) `taxwise-voice` responds to Twilio with TwiML or bridges the call to VAPI for a live AI conversation.

---

## 2) Sequence flows and diagrams

2.1 Inbound call -> AI agent (end-to-end)

1. Caller dials Twilio number.
2. Twilio sends HTTP POST to `https://<BASE_URL>/voice/incoming`.
3. `taxwise-voice` verifies request, logs event, and either responds with TwiML or orchestrates a SIP/WebSocket bridge to VAPI.
4. VAPI initiates tool queries to `https://<BASE_URL>/vapi/tool/query` to fetch user vitals (requires `VAPI_TOOL_TOKEN`).
5. `taxwise-voice` may query Backend (`/api/*`) to retrieve user data from MongoDB.
6. VAPI returns responses; the call continues and the user hears answers.

2.2 Frontend -> API -> Alerts flow

1. User uploads statements through Frontend (uses `useStatementUpload`).
2. Frontend posts files to Backend `POST /api/transactions/import`.
3. Backend processes files, stores transactions, updates user profiles and triggers alert checks.
4. Alerts service (either in backend or taxwise-voice depending on config) detects anomalies and schedules notifications.
5. Notifications are sent via Twilio (SMS/WhatsApp/voice) using Twilio credentials.

Diagram (simplified):

```
Frontend (React)
   | POST /transactions/import
   v
Backend (Express) -> parse & store -> MongoDB
   |                                   ^
   | schedule alerts                   |
   v                                   |
taxwise-voice (alerts/cron) ----------+
   | send SMS/WhatsApp via Twilio
   v
User notification
```

---

## 3) Component breakdown (what lives where)

3.1 Frontend (`Frontend/`)
- React + Vite app. Entry: `src/main.jsx`.
- Key files: `src/App.jsx`, `src/pages/dashboard/*`, `src/components/*`, `src/contexts/AuthContext.jsx`, `src/contexts/BrandingContext.jsx`.
- Styling: Tailwind via `src/index.css`; uses `Plus Jakarta Sans` font and supports dark mode.

3.2 Backend (`backend/`)
- Express server. Entry: `src/index.js`.
- Config: `src/config/env.js`, DB connect in `src/config/database.js`.
- Core domains: `routes/*` (`auth`, `aadhaar-auth`, `kyc`, `transactions`, `tax`, `credit`, `dashboard`, `reports`) and `services/*` (aadhaar parsers, AI helper, security helpers).

3.3 TaxWise Voice (`taxwise-voice/`)
- Express server specialized for telephony.
- Routes: `src/routes/voice.js` (incoming/status callbacks), `src/routes/vapiTools.js` (secure tool endpoints used by VAPI), services: `twilioClient.js`, `alerts.js`.
- Expects `BASE_URL` to be publicly reachable (ngrok during local dev).

3.4 Chrome Extension (`chrome-extension/`)
- Lightweight React + Vite app that bundles a small UI for quick access.

---

## 4) Environment & configuration (per-service)

All secrets go into `.env` files in each service directory. High-level variables (examples):

- Frontend (`Frontend/`):
  - `VITE_API_URL` — e.g., `http://localhost:3001` (used by frontend to contact backend)
  - EmailJS keys: `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`

- Backend (`backend/`):
  - `MONGO_URI` or `MONGODB_URI` — MongoDB connection string
  - `PORT` — server port
  - `JWT_SECRET`, `AADHAAR_SALT` — security secrets
  - `ENABLE_RATE_LIMITING`, `MAX_FILE_SIZE` etc.

- TaxWise Voice (`taxwise-voice/`):
  - `PORT`, `BASE_URL` (public), `MONGO_URI`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`
  - `VAPI_TOOL_TOKEN`, `VAPI_SIP_URI` / `VAPI_WS_URL`
  - `WHATSAPP_FROM`, `ALERTS_SMS_FROM`, `YOUR_WHATSAPP_NUMBER`

Security tips:
- Keep secrets out of source control. Use `.env.example` as template.
- Use a secret manager in production and set proper network rules for MongoDB.

---

## 5) How to run everything locally (PowerShell)

Follow this order for a smooth local dev experience (frontend talking to local backend and voice service reachable via ngrok):

1) Start local MongoDB (optional: Docker)

```powershell
REM optional: run MongoDB via Docker
docker run --name taxwise-mongo -p 27017:27017 -d mongo:6
```

2) Start Backend

```powershell
cd d:\Programming\BitNBuild-25_GRIND\backend
npm install
REM create .env from example and set MONGO_URI and JWT_SECRET
npm run dev
```

3) Start TaxWise Voice

```powershell
cd d:\Programming\BitNBuild-25_GRIND\taxwise-voice
npm install
REM copy .env.example -> .env and set BASE_URL to your ngrok URL later
npm run dev
```

Open another terminal and run ngrok to expose the voice port:

```powershell
.\ngrok.exe http 3001
REM update BASE_URL in .env and restart taxwise-voice if needed
```

4) Start Frontend

```powershell
cd d:\Programming\BitNBuild-25_GRIND\Frontend
npm install
REM set VITE_API_URL in .env.local if you want to call the local backend
npm run dev
```

5) (Optional) Chrome extension dev build

```powershell
cd d:\Programming\BitNBuild-25_GRIND\chrome-extension
npm install
npm run dev
REM load unpacked into chrome via chrome://extensions
```

Notes:
- Restart `taxwise-voice` whenever `BASE_URL` changes (new ngrok URL).
- Use `POST /api/auth/demo-login` or `taxwise-voice`'s seed scripts to create demo users.

---

## 6) Important endpoints & Twilio/VAPI configuration

Configure these endpoints in Twilio and VAPI:

- Twilio (Phone Number settings):
  - A CALL COMES IN (Voice): `https://<BASE_URL>/voice/incoming` (HTTP POST)
  - Status Callback: `https://<BASE_URL>/voice/status-callback` (HTTP POST)

- VAPI agent tool config (example):
  - Tool URL: `https://<BASE_URL>/vapi/tool/query`
  - Header: `Authorization: Bearer <VAPI_TOOL_TOKEN>`

- Backend API examples (frontend integration):
  - `POST ${VITE_API_URL}/api/transactions/import` — upload statements
  - `POST ${VITE_API_URL}/api/aadhaar-auth/login` — Aadhaar login
  - `GET ${VITE_API_URL}/api/dashboard/overview` — protected summary

---

## 7) Troubleshooting & common gotchas (detailed)

1) MongoDB SRV/DNS errors when using Atlas
- Symptom: `querySrv ESERVFAIL _mongodb._tcp.cluster0...`
- Fixes:
  - Use `mongodb://host:port` direct connection if DNS is unreliable.
  - Ensure your network allows SRV DNS queries and your system resolver works.
  - Verify Atlas IP whitelist (allow your dev IP or 0.0.0.0/0 for testing).

2) Twilio cannot reach `taxwise-voice`
- Symptom: Twilio webhook errors or timeouts.
- Fixes:
  - Run `ngrok http <port>` and set `BASE_URL` in `taxwise-voice/.env` to the forwarded URL.
  - Inspect requests in ngrok's web UI to see Twilio's payloads.

3) VAPI tool auth failing
- Ensure `VAPI_TOOL_TOKEN` matches the token set in the VAPI agent tool configuration.

4) File upload errors
- Ensure backend `MAX_FILE_SIZE` and allowed types match the frontend's upload configuration.

5) Frontend CORS errors
- Set `VITE_API_URL` in frontend `.env.local` and configure backend CORS (allowed origins include `http://localhost:5173`).

---

## 8) Testing, seeding & developer workflows

- Seed demo data:
  - Backend and TaxWise Voice may include `seed.js`. Run `npm run seed` in the respective folder to seed demo users.
- Demo login:
  - `POST /api/auth/demo-login` (backend) creates or returns a demo user and tokens.
- Test inbound call flow:
  - Start taxwise-voice and expose with ngrok. Configure Twilio Phone Number webhooks to the ngrok URL. Call the Twilio number and watch the taxwise-voice logs.

Automated tests (recommendations):
- Unit tests: add tests for Aadhaar parsers (`qrParser`, `xmlParser`) and for token generation/validation.
- Integration tests: `supertest` for backend routes (upload flows and auth).

---

## 9) Security & production hardening checklist

- Use a secret manager to store `JWT_SECRET`, `VAPI_TOOL_TOKEN`, `TWILIO_AUTH_TOKEN`.
- Use TLS (https) for all public endpoints (ngrok for dev, real certificates for prod).
- Set strict CORS in production and enable rate limiting for sensitive endpoints.
- Monitor logs for suspicious activity and ensure audit events (login/password events) are stored.

---

## 10) Next steps & roadmap (recommended)

Short-term (complete in days):
- Add `VITE_API_URL` to Frontend and an `src/lib/api.js` wrapper that centralizes API calls and auth header handling.
- Add `GET /health` endpoints across services (backend, taxwise-voice) and a `dev/health-check.ps1` script.
- Add demo Postman collection and a `dev` folder with example curl commands.

Medium-term (weeks):
- Add unit & integration tests for critical flows (Aadhaar parsing, auth, Twilio webhook handling).
- Add CI that runs lint and tests on PRs.
- Add a database migration tool to manage schema changes.

Long-term (months):
- Add storybook for UI components.
- Performance budgets and observability (APM, structured logs, and alerting).

---

If you want, I can now implement one of the follow-ups for you:
- Add `VITE_API_URL` example and implement a small `src/lib/api.js` in the frontend.
- Create `dev/health-check.ps1` and `dev/dev-all.ps1` to bootstrap services and run health checks.
- Add unit tests for Aadhaar parsers and a test runner.

Tell me which follow-up you'd like and I'll implement it.
