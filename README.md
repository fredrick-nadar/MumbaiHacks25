<!--
  Master README for MumbaiHacks25 (TaxWise)
  Complete documentation for Frontend, Backend, VoiceAgent, TaxWise Voice, and Chrome Extension
  Single source-of-truth for developers, operators, and hackathon judges.
-->
# TaxWise — AI-Powered Financial Intelligence Platform

**An intelligent voice-based financial assistant with automated tax calculations, expense tracking, and personalized tax optimization**

This repository contains the complete TaxWise platform built for MumbaiHacks25:
- 🎨 **Frontend**: React + Vite dashboard with real-time financial insights
- ⚙️ **Backend**: Node.js + Express + MongoDB API with Aadhaar-based authentication
- 🎙️ **VoiceAgent**: Twilio-powered multilingual voice assistant with AI tax calculator
- 📞 **TaxWise Voice**: VAPI-integrated advanced voice service with alerts
- 🔌 **Chrome Extension**: Quick access browser extension

**Key Innovation**: Step-by-step conversational tax calculator that asks 4 simple questions and provides Old vs New regime comparison with taxable income breakdowns — all via voice in Hindi/English.

Audience: Developers, DevOps engineers, and hackathon judges evaluating the technical implementation.

---

## Table of contents

1. 🌟 Key Features & Innovation
2. 🏗️ High-level Architecture
3. 📱 Component Breakdown
   - VoiceAgent (Main Innovation)
   - Frontend Dashboard
   - Backend API
   - TaxWise Voice (VAPI)
   - Chrome Extension
4. 🎙️ Voice Tax Calculator (Step-by-Step Flow)
5. 🔧 Environment & Configuration
6. 🚀 Quick Start Guide (PowerShell)
7. 📞 Twilio/VAPI Configuration
8. 🧪 Testing & Demo Workflows
9. 🐛 Troubleshooting Guide
10. 🔐 Security Checklist
11. 📊 Tech Stack & Dependencies
12. 🗺️ Roadmap & Next Steps

---

## 1) 🌟 Key Features & Innovation

### Voice Tax Calculator (Main Hackathon Innovation)
- ✅ **4-Question Conversational Flow** in Hindi/English
  1. Annual Salary Income (सालाना सैलरी)
  2. Other Taxable Income (अन्य आय)
  3. Section 80C Investments (80C निवेश)
  4. Other Deductions (अन्य छूट)
- ✅ **Automatic Tax Calculation** for both Old & New regime
- ✅ **Taxable Income Breakdown** with regime recommendation
- ✅ **Smart Amount Parsing**: Understands "12 lakh", "1.5 lakh", "zero"
- ✅ **Real-time Voice Response** via Twilio TTS (Hindi voices)

### Platform Features
- 🗣️ **Voice-First Interface**: Call and get instant tax advice
- 🌐 **Multilingual**: Hindi (primary), English, Tamil, Telugu
- 🤖 **Master-Slave AI Architecture**: Intelligent agent orchestration
- 💰 **Financial Intelligence**: Expense tracking, investment advice
- 📊 **Real-time Analysis**: MongoDB-backed personalized insights
- 🔐 **Aadhaar Authentication**: Secure login with government ID
- 📱 **Responsive Dashboard**: React-based modern UI
- 🔔 **Smart Alerts**: Twilio SMS/WhatsApp notifications

---

## 2) 🏗️ High-level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interactions                         │
├─────────────────────────────────────────────────────────────────┤
│  📱 Web Dashboard  │  📞 Phone Call  │  🔌 Chrome Extension     │
└──────┬──────────────┴────────┬───────┴──────────┬───────────────┘
       │                       │                   │
       │ HTTP/REST             │ Twilio Webhooks   │ HTTP/REST
       │                       │                   │
       ▼                       ▼                   ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Frontend     │    │   VoiceAgent     │    │     Backend     │
│  (React+Vite)   │    │  (Twilio+Groq)   │    │  (Express+Mongo)│
│   Port: 5173    │    │   Port: 3000     │    │   Port: 3001    │
└────────┬────────┘    └────────┬─────────┘    └────────┬────────┘
         │                      │                        │
         │                      │                        │
         └──────────────────────┼────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   MongoDB Atlas       │
                    │   (User Data, Tax     │
                    │   Profiles, Txns)     │
                    └───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Twilio Cloud        │
                    │   (SMS, Voice,        │
                    │    WhatsApp)          │
                    └───────────────────────┘
```

### Voice Tax Calculator Flow (End-to-End)

```
User → Calls Twilio Number
  ↓
Twilio → POST /voice/incoming (VoiceAgent)
  ↓
VoiceAgent → Greets user by name (MongoDB lookup)
  ↓
User → Says "कैलकुलेट माय टैक्स"
  ↓
VoiceAgent → Detects trigger, starts tax calculator
  ↓
Tax Calculator Agent → Asks Q1: "आपकी सालाना सैलरी कितनी है?"
  ↓
User → "12 lakh"
  ↓
Tax Calculator → Parses ₹12,00,000 → Asks Q2
  ↓
[Repeats for Q2: Other Income, Q3: 80C, Q4: Other Deductions]
  ↓
Tax Calculator → Calculates:
  - Gross Income
  - Old Regime: Taxable Income + Tax
  - New Regime: Taxable Income + Tax
  - Recommendation (which saves more)
  ↓
VoiceAgent → Speaks result in Hindi
  ↓
User → Hears complete tax breakdown and recommendation
```

---

## 3) 📱 Component Breakdown

### 🎙️ VoiceAgent (Port 3000) — **Main Innovation**

**The Star of MumbaiHacks25**: Conversational tax calculator via phone calls

**Location**: `VoiceAgent/`

**Key Features**:
- ✅ **Tax Calculator Agent**: 4-question conversational flow
  - Asks questions one by one in Hindi/English
  - Parses amounts: "12 lakh" → ₹12,00,000
  - Calculates Old vs New regime tax
  - Returns taxable income breakdown
- ✅ **Master-Slave Architecture**: Intelligent agent orchestration
- ✅ **MongoDB Integration**: User lookup by phone number
- ✅ **Multilingual**: Hindi (primary), English, Tamil, Telugu
- ✅ **Twilio Integration**: Voice webhooks with TTS

**Project Structure**:
```
VoiceAgent/
├── server.js                    # Express server with webhooks
├── twilioAgent.js               # Twilio integration & call handling
├── makeCall.js                  # Test script for outbound calls
├── agents/
│   ├── master/
│   │   ├── masterAgent.js       # Main orchestrator
│   │   ├── taskRouter.js        # Intent-to-agent mapping
│   │   ├── collaborationManager.js
│   │   └── languageManager.js
│   └── slaves/
│       ├── tax/
│       │   ├── taxCalculatorAgent.js  # ⭐ 4-step tax calculator
│       │   ├── taxAgent.js            # General tax advice
│       │   └── taxReasoner.js
│       ├── expense/expenseAgent.js
│       ├── investment/investmentAgent.js
│       └── income/incomeAgent.js
├── core/
│   ├── prompts.js               # AI prompts for agents
│   ├── schema.js                # Data schemas
│   ├── contextManager.js        # Conversation context
│   ├── memoryStore.js           # In-memory storage
│   └── eventBus.js              # Agent communication
├── models/                      # MongoDB models
│   ├── User.js
│   ├── TaxProfile.js
│   ├── Transaction.js
│   └── VoiceConversation.js
├── services/
│   ├── dbService.js             # Database operations
│   └── elevenlabsService.js     # TTS service
└── config/
    ├── env.js
    └── database.js
```

**Tax Calculator Implementation**:
```javascript
// Example: How it works
Step 1: User says "calculate my tax"
  → Agent asks: "आपकी सालाना सैलरी कितनी है?"
  
Step 2: User says "12 lakh"
  → Agent parses ₹12,00,000
  → Agent asks: "क्या आपकी कोई अन्य आय है?"
  
Step 3: User says "50 thousand"
  → Agent parses ₹50,000
  → Agent asks: "80C में कितना निवेश किया है?"
  
Step 4: User says "1.5 lakh"
  → Agent parses ₹1,50,000
  → Agent asks: "कोई अन्य छूट?"
  
Step 5: User says "zero"
  → Agent calculates:
     Gross: ₹12.5L
     Old Regime: Taxable ₹10.5L, Tax ₹1.3L
     New Regime: Taxable ₹12.0L, Tax ₹83K
     Recommendation: NEW regime saves ₹49K
```

**API Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/voice/incoming` | POST | Twilio webhook (new call) |
| `/voice/process` | POST | Twilio webhook (speech input) |
| `/voice/status` | POST | Call status updates |
| `/test` | GET | Test agent without calling |

---

### 🎨 Frontend (Port 5173)

**Location**: `Frontend/`

**Tech Stack**: React 18 + Vite + Tailwind CSS + Framer Motion

**Key Features**:
- ✅ Modern dashboard with dark mode
- ✅ Real-time financial analytics
- ✅ Tax calculator UI
- ✅ Expense tracking interface
- ✅ Investment portfolio viewer
- ✅ Aadhaar authentication UI
- ✅ Responsive design (mobile-first)

**Project Structure**:
```
Frontend/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root component
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Overview.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── TaxPlanner.jsx
│   │   │   └── Reports.jsx
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── AadhaarAuth.jsx
│   │   └── landing/
│   │       └── LandingPage.jsx
│   ├── components/
│   │   ├── charts/
│   │   ├── forms/
│   │   └── layout/
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── BrandingContext.jsx
│   ├── hooks/
│   │   └── useStatementUpload.js
│   ├── services/
│   │   └── api.js
│   └── lib/
│       └── utils.js
├── public/
│   └── images/
├── index.html
├── vite.config.js
└── tailwind.config.js
```

**Environment Variables**:
```env
VITE_API_URL=http://localhost:3001
VITE_EMAILJS_PUBLIC_KEY=your_key
VITE_EMAILJS_SERVICE_ID=your_service
VITE_EMAILJS_TEMPLATE_ID=your_template
```

---

### ⚙️ Backend (Port 3001)

**Location**: `backend/`

**Tech Stack**: Node.js + Express + MongoDB + Mongoose

**Key Features**:
- ✅ Aadhaar-based authentication
- ✅ KYC verification
- ✅ Transaction import (Excel/CSV/PDF)
- ✅ Tax calculation engine
- ✅ Credit score integration
- ✅ Dashboard analytics API
- ✅ Report generation

**Project Structure**:
```
backend/
├── src/
│   ├── index.js                 # Express server
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── aadhaar-auth.js      # Aadhaar login
│   │   ├── kyc.js               # KYC verification
│   │   ├── transactions.js      # Transaction import
│   │   ├── tax.js               # Tax calculations
│   │   ├── credit.js            # Credit score
│   │   ├── dashboard.js         # Dashboard data
│   │   └── reports.js           # PDF reports
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── TaxProfile.js
│   │   └── KYCDocument.js
│   ├── services/
│   │   ├── aadhaarParser.js     # QR/XML parsing
│   │   ├── taxCalculator.js     # Tax engine
│   │   ├── creditScore.js       # Score calculation
│   │   └── aiHelper.js          # AI utilities
│   └── middleware/
│       ├── auth.js              # JWT verification
│       ├── rateLimiter.js
│       └── errorHandler.js
├── contracts/                   # Blockchain (Polygon)
│   └── InsuranceRegistry.sol
├── scripts/
│   └── debugExcel.js
└── uploads/                     # Temporary file storage
```

**API Endpoints** (Sample):
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/demo-login` | POST | Demo login |
| `/api/aadhaar-auth/login` | POST | Aadhaar login |
| `/api/transactions/import` | POST | Upload statements |
| `/api/tax/calculate` | POST | Calculate tax |
| `/api/dashboard/overview` | GET | Dashboard summary |
| `/api/credit/score` | GET | Credit score |

---

### 📞 TaxWise Voice (VAPI Integration)

**Location**: `taxwise-voice/`

**Advanced voice service with VAPI integration** (separate from VoiceAgent)

**Key Features**:
- ✅ VAPI agent integration
- ✅ Voice alerts (Twilio)
- ✅ SMS/WhatsApp notifications
- ✅ Gemini AI integration
- ✅ Secure tool endpoints

---

### 🔌 Chrome Extension

**Location**: `chrome-extension/`

**Quick access browser extension** for TaxWise features

**Tech Stack**: React + Vite (builds to static extension)

**Features**:
- ✅ Quick tax lookup
- ✅ Expense logging
- ✅ Dashboard access

---

## 4) 🎙️ Voice Tax Calculator (Detailed Flow)

### Tax Calculator Features

**4 Simple Questions**:
1. **Annual Salary Income** (आपकी सालाना सैलरी कितनी है?)
2. **Other Taxable Income** (क्या आपकी कोई अन्य आय है?)
3. **Section 80C Investments** (80C में कितना निवेश किया है?)
4. **Other Deductions** (कोई अन्य छूट जैसे HRA?)

**Smart Amount Parsing**:
- "12 lakh" → ₹12,00,000
- "1.5 lakh" → ₹1,50,000
- "50 thousand" → ₹50,000
- "zero" → ₹0
- Direct numbers: "150000" → ₹1,50,000

**Calculations**:
```javascript
Inputs: Salary, Other Income, 80C, Other Deductions
  ↓
Gross Income = Salary + Other Income
  ↓
OLD REGIME:
  Taxable Income = Gross - Standard(50K) - 80C - Other
  Tax = Calculated per slabs (5%, 20%, 30%)
  ↓
NEW REGIME:
  Taxable Income = Gross - Standard(50K)
  Tax = Calculated per slabs (5%, 10%, 15%, 20%, 30%)
  ↓
COMPARISON:
  Which regime has lower tax?
  Savings = Difference between regimes
```

### Example Call Transcript

```
📞 Call starts

Agent: "नमस्ते Kamraan जी! मैं आपका वित्तीय सहायक हूँ। 
       आप मुझसे खर्च, कर बचत, और निवेश के बारे में पूछ सकते हैं।"

User: "कैलकुलेट माय टैक्स"

Agent: "चलिए आपका टैक्स कैलकुलेट करते हैं! 
       आपकी सालाना सैलरी कितनी है?"

User: "12 lakh"

Agent: "ठीक है! ₹12.0L नोट किया। अब, 
       क्या आपकी कोई अन्य आय है जैसे किराया, ब्याज, या फ्रीलांस?"

User: "50 thousand"

Agent: "ठीक है! ₹50K नोट किया। अब, 
       80C में कितना निवेश किया है? इसमें PF, PPF, ELSS शामिल है।"

User: "1.5 lakh"

Agent: "ठीक है! ₹1.5L नोट किया। अब, 
       कोई अन्य छूट जैसे HRA, एजुकेशन लोन ब्याज?"

User: "zero"

Agent: "टैक्स कैलकुलेशन पूरा हुआ! 
       आपकी कुल आय ₹12.5L है। 
       पुरानी व्यवस्था में: कर योग्य आय ₹10.5L है, टैक्स ₹1.3L है। 
       नई व्यवस्था में: कर योग्य आय ₹12.0L है, टैक्स ₹83K है। 
       नई व्यवस्था से ₹49K बचत होगी। 
       मैं नई व्यवस्था की सलाह देता हूं।"
```

### Tax Calculation Logic

**Old Regime (FY 2024-25)**:
- ₹0 - 2.5L: 0%
- ₹2.5L - 5L: 5%
- ₹5L - 10L: 20%
- Above ₹10L: 30%
- Plus 4% cess
- Deductions: Standard (₹50K) + 80C (max ₹1.5L) + Other

**New Regime (FY 2024-25)**:
- ₹0 - 3L: 0%
- ₹3L - 7L: 5%
- ₹7L - 10L: 10%
- ₹10L - 12L: 15%
- ₹12L - 15L: 20%
- Above ₹15L: 30%
- Plus 4% cess
- Deductions: Only standard ₹50K

### Session Management

```javascript
// Each call gets a unique session
const session = {
  userId: '6929dfe9d924c42f5466fae7',
  step: 0,  // Current question (0-3)
  awaitingInput: true,  // Waiting for user response
  data: {
    salaryIncome: null,
    otherIncome: null,
    section80C: null,
    otherDeductions: null
  },
  completed: false
};

// Session is stored in memory (Map)
// Cleaned up after call completes
```

---

## 5) 🔧 Environment & Configuration

### VoiceAgent `.env` (Port 3000)

```env
# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/taxwise

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+17626752485
YOUR_PHONE_NUMBER=+12242314556

# Groq AI
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Server
PORT=3000
NODE_ENV=development
NGROK_URL=https://bde9373f72a5.ngrok-free.app

# Optional: ElevenLabs TTS
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=voice_id
```

### Frontend `.env` (Port 5173)

```env
VITE_API_URL=http://localhost:3001

# EmailJS (optional)
VITE_EMAILJS_PUBLIC_KEY=your_key
VITE_EMAILJS_SERVICE_ID=service_id
VITE_EMAILJS_TEMPLATE_ID=template_id
```

### Backend `.env` (Port 3001)

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taxwise

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key_here

# Security
AADHAAR_SALT=random_salt_for_aadhaar_hashing
ENABLE_RATE_LIMITING=true
MAX_FILE_SIZE=10485760

# Optional: Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_wallet_private_key
```

### TaxWise Voice `.env`

```env
# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/taxwise

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_NUMBER=+1234567890
WHATSAPP_FROM=whatsapp:+1234567890
YOUR_WHATSAPP_NUMBER=whatsapp:+919876543210

# VAPI
VAPI_TOOL_TOKEN=your_secret_token
VAPI_SIP_URI=sip:user@vapi.ai
VAPI_WS_URL=wss://api.vapi.ai

# Server
PORT=3001
BASE_URL=https://your-ngrok-url.ngrok-free.app

# Gemini AI (optional)
GEMINI_API_KEY=your_gemini_key
```

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
