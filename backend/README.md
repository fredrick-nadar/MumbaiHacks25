# Backend — TaxWise API (Detailed README)

This document explains the `backend/` service: the Node.js/Express API that powers authentication (Aadhaar-based and legacy), KYC flows, uploads, taxation endpoints, credit integrations, and reporting. It includes how the server starts, configuration and environment variables, key routes and files, run/debug instructions (PowerShell), and troubleshooting advice.

---

Quick summary
- Tech: Node.js, Express, Mongoose (MongoDB), Helmet, Morgan, Tailwind not required here
- Entrypoint: `src/index.js`
- Key features: Aadhaar-based auth, Aadhaar QR/XML parsing, KYC sessions, transactions import, tax calculation endpoints, credit/CIBIL integrations, reporting

---

Table of contents
- Quick start (PowerShell)
- Environment & configuration
- Key files and modules
- Important routes and example requests
- File uploads and Aadhaar flows
- Testing, seeding, and demo users
- Troubleshooting & common errors
- Security considerations
- Suggested improvements & next steps

---

Quick start (PowerShell)

1) Install dependencies and run the server

```powershell
cd d:\Programming\BitNBuild-25_GRIND\backend
npm install
npm run dev
```

`npm run dev` uses `nodemon` to restart on file changes. The server listens on `process.env.PORT` or default port in `src/config/env.js` (default 3001 in config but `index.js` falls back to 5000 — check your `.env`).

2) Health check

Open: `http://localhost:<PORT>/api/health` to verify the server is running.

---

Environment & configuration

Configuration is loaded by `src/config/env.js` which reads from environment variables and provides sane defaults. Key variables to set in `.env`:

- `MONGO_URI` or `MONGODB_URI` — MongoDB connection string. Example for local: `mongodb://localhost:27017/taxwise`. Atlas example: `mongodb+srv://user:pass@cluster0.example.net/taxwise`.
- `PORT` — HTTP server port.
- `NODE_ENV` — `development` or `production`.
- `JWT_SECRET` — Security secret for signing tokens (set a secure value in production).
- `AADHAAR_SALT` — Salt used in Aadhaar hashing (set to a secure value in production).
- `BCRYPT_ROUNDS` — Number of bcrypt rounds (default is 12 in config).
- `MAX_FILE_SIZE` — Maximum file upload size (bytes).
- Rate limiting / security toggles (see `env.js`): `ENABLE_RATE_LIMITING`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.

Note about Mongo SRV/DNS issues:
- The code handles DB connection errors gracefully (see `src/config/database.js`). If SRV DNS fails (e.g., `querySrv ESERVFAIL`), the app logs the error and continues running for local webhook/testing. For production, fix DNS or use non-SRV connection strings.

---

Key files and modules

- `src/index.js` — main server. Sets middleware (helmet, cors), rate limiting, mounts routes, and exposes `GET /api/health` and `/api/aadhaar-auth/info`.
- `src/config/env.js` — configuration helper.
- `src/config/database.js` — mongoose connection and graceful shutdown logic.
- `src/routes/` — Express routers for domain areas:
  - `auth.js` — legacy auth & demo login
  - `aadhaar-auth.js` — Aadhaar QR/XML auth and password reset flows
  - `kyc.js` — KYC related routes
  - `transactions.js` — transaction imports and parsing
  - `tax.js` — tax calculation endpoints
  - `credit.js` — credit report integration
  - `dashboard.js` — dashboard data endpoints
  - `reports.js` — reporting exports and endpoints
- `src/services/` — core business logic and utilities:
  - `aadhaar/qrParser.js`, `aadhaar/xmlParser.js`, `aadhaar/normalize.js`, `aadhaar/hasher.js` — Aadhaar parsing & normalization
  - `ai/gemini.js` — AI/LLM integration helper
  - `security/*` — rate limiting, password generation, auth helpers, file upload handling
- `src/models/` — Mongoose models: `User`, `Transaction`, `TaxProfile`, `CreditReport`, `Category`, `LoginEvent`, `PasswordEvent`, `KycSession`, etc.
- `src/middleware/` — error handler and auth middleware (`authenticateToken`, `authenticate`, `validateRequest`).

---

Important routes & example requests

Auth & Aadhaar flows

- `POST /api/aadhaar-auth/login` — Aadhaar-based login. Request body: `{ nameLoginKey, password }`.
- `GET /api/aadhaar-auth/me` — get current authorized user (requires `Authorization: Bearer <token>`).
- `POST /api/aadhaar-auth/password-reset/qr` — upload Aadhaar QR image to reset password. Multipart upload (file under `file`), server parses QR, validates Aadhaar, and resets password.

Transactions & data

- `POST /api/transactions/import` — upload or submit transactions. Check `transactions.js` for expected payload.
- `GET /api/dashboard/overview` — dashboard summaries (protected).

Reports & tax

- `POST /api/tax/calculate` — calculate tax for user or dataset.
- `GET /api/reports/export` — get downloadable exports (CSV/PDF).

Example curl (demo login):

```powershell
curl -X POST http://localhost:3001/api/auth/demo-login -H "Content-Type: application/json" -d "{}"
```

---

File uploads & Aadhaar parsing

- Uploads are saved to `uploads/` (created by `src/index.js`) and cleaned up by parsing services.
- The Aadhaar QR parser (`src/services/aadhaar/qrParser.js`) extracts name, dob, uid/reference, and other fields — the route normalizes them and finds user by Aadhaar hash.
- Uploaded files are validated by `src/services/security/fileUpload.js` which checks file types and size.

Security, rate limiting and logging

- Helmet is used to set secure headers.
- `express-rate-limit` is configured via `src/services/security/rateLimit.js` and applied globally. Sensitive endpoints (login, password reset) have stricter limiters.
- All auth flows are logged to `LoginEvent` and `PasswordEvent` models for audit.

---

Seeding & demo

- `package.json` has `start` and `dev` scripts. For seeding, check if a `seed.js` exists in the project root (other subprojects have seeds). Use a seed script to populate a demo user for local testing.
- `POST /api/auth/demo-login` creates/fetches a demo user and returns tokens — useful for frontend integration testing without real Aadhaar data.

---

Troubleshooting & common errors

1) MongoDB connection failures (SRV / DNS)
- Error: `querySrv ESERVFAIL _mongodb._tcp.cluster0...`
  - Cause: DNS SRV record resolution blocked or failing.
  - Quick fixes: Use a non-SRV connection string (`mongodb://host:port`) or run from a network that allows DNS SRV. Verify Atlas IP whitelist.

2) File upload errors
- If uploads fail with `413` or `file too large`, increase `MAX_FILE_SIZE` in `.env` or client-side chunk the uploads.

3) Auth token invalid/expired
- Ensure `JWT_SECRET` is same across services and not the default fallback in production. Check `jwtRefresh` flows in `aadhaar-auth.js`.

4) Unexpected 500s
- Tail `nodemon` logs (where `npm run dev` runs). The `errorHandler` middleware returns stack traces in development — check logs for stack and offending file.

---

Security considerations

- Rotate `JWT_SECRET` and `AADHAAR_SALT` in prod and keep them in a secret store (Azure Key Vault, AWS Secrets Manager, or environment variables set by your deployment pipeline).
- Ensure uploads directory is not publicly served and validate/scan uploaded files.
- Keep rate limiting enabled for sensitive endpoints and configure secure CORS in production.

---

Suggested improvements & next steps

- Add unit tests for the Aadhaar parsers (`qrParser`, `xmlParser`) using fixture images and sample XML to prevent regressions.
- Add integration tests that exercise the full Aadhaar password-reset flow using `supertest` and mocked file uploads.
- Add a database migration system (e.g., `migrate-mongo` or `mongoose-migrate`) for schema changes.
- Create a `dev` script to bootstrap the backend with a demo user and test dataset.

---

Files referenced in this README (quick jump)
- `src/index.js`
- `src/config/env.js`
- `src/config/database.js`
- `src/routes/aadhaar-auth.js`
- `src/services/aadhaar/qrParser.js`
- `src/services/security/auth.js`
- `src/models/User.js`

---

If you'd like, I can:
- Add example `curl`/Postman requests for the most common API flows (login, demo-login, upload QR, calculate tax).
- Create a `backend/dev-setup.ps1` that sets environment variables, starts a local MongoDB via Docker, and runs `npm run dev`.
- Add unit tests for `qrParser` and a small mocha/jest config to run them.

Tell me which follow-up you'd like and I'll implement it.
