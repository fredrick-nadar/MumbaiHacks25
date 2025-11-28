# 🎙️ HCM-AFIS Voice Agent

**Hierarchical Collaborative Multi-Agent Financial Intelligence System**

A voice-powered multilingual financial assistant using Master-Slave agent architecture with Twilio and Groq AI.

## 🌟 Features

- 🗣️ **Voice-first Interface**: Talk to your financial assistant via phone
- 🌐 **Multilingual Support**: Hindi, English, Tamil, Telugu
- 🤖 **Master-Slave Architecture**: Intelligent agent orchestration
- 💰 **Financial Intelligence**: Expense tracking, tax optimization, investment advice
- 📊 **Real-time Analysis**: Instant financial insights and recommendations

## 🏗️ Architecture

### Master Agent
- **MasterAgent**: Orchestrates all slave agents
- **TaskRouter**: Routes intents to appropriate agents
- **CollaborationManager**: Manages agent execution (sequential/parallel)
- **LanguageManager**: Handles translation and language detection

### Slave Agents
1. **ExpenseAgent**: Expense tracking, categorization, budgeting
2. **TaxAgent**: Tax calculation, deduction suggestions, regime comparison
3. **InvestmentAgent**: SIP suggestions, portfolio advice, risk analysis
4. **IncomeAgent**: Income tracking, forecasting, stability analysis

## 📁 Project Structure

```
VoiceAgent/
├── agents/
│   ├── master/
│   │   ├── masterAgent.js
│   │   ├── taskRouter.js
│   │   ├── collaborationManager.js
│   │   └── languageManager.js
│   └── slaves/
│       ├── expense/
│       │   ├── expenseAgent.js
│       │   ├── expenseReasoner.js
│       │   └── expenseMemory.js
│       ├── tax/
│       │   ├── taxAgent.js
│       │   ├── taxReasoner.js
│       │   └── taxMemory.js
│       ├── investment/
│       │   ├── investmentAgent.js
│       │   ├── investmentReasoner.js
│       │   └── investmentMemory.js
│       └── income/
│           ├── incomeAgent.js
│           ├── incomeReasoner.js
│           └── incomeMemory.js
├── core/
│   ├── schema.js
│   ├── prompts.js
│   ├── contextManager.js
│   ├── memoryStore.js
│   └── eventBus.js
├── config/
│   └── env.js
├── server.js
├── twilioAgent.js
├── makeCall.js
├── package.json
└── .env
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Twilio account with a phone number
- Groq API key
- ngrok installed globally

### Step 1: Install Dependencies

```bash
cd VoiceAgent
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Twilio Credentials (from https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Your Phone Number (to receive calls)
YOUR_PHONE_NUMBER=+919876543210

# Server Configuration
PORT=3000
NODE_ENV=development

# Groq API (from https://console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Ngrok (will be updated in next step)
NGROK_URL=
```

### Step 3: Start the Server

```bash
npm start
```

You should see:

```
🚀 HCM-AFIS Voice Agent Server Started
📡 Server running on port: 3000
🌐 Local URL: http://localhost:3000
```

### Step 4: Set Up ngrok

In a **new terminal**:

```bash
ngrok http 3000
```

Copy the **https URL** (e.g., `https://abc123.ngrok.io`)

Update `.env`:

```env
NGROK_URL=https://abc123.ngrok.io
```

**Restart the server** (Ctrl+C and run `npm start` again)

### Step 5: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your phone number
3. Scroll to "Voice Configuration"
4. Set "A Call Comes In" to:
   ```
   https://abc123.ngrok.io/voice/incoming
   ```
5. Set HTTP method to **POST**
6. Click **Save**

### Step 6: Make a Test Call

```bash
npm run call
```

Or:

```bash
node makeCall.js
```

You'll receive a call on `YOUR_PHONE_NUMBER` from `TWILIO_PHONE_NUMBER`!

## 🎯 Usage Examples

### Voice Commands (Hindi)

```
"मैंने आज 500 रुपए खाने पर खर्च किए"
→ Logs expense, analyzes spending, checks tax deductibility

"Tax कैसे बचाऊं?"
→ Provides tax-saving suggestions (80C, 80D, NPS)

"निवेश की सलाह दो"
→ Recommends SIP plans, ELSS, PPF based on risk profile

"मेरी income और expenses बताओ"
→ Analyzes income vs expenses, suggests budget
```

### Voice Commands (English)

```
"I spent 500 rupees on food today"
"How can I save tax?"
"Give me investment advice"
"What's my income and expenses?"
```

### Test via Browser

```
http://localhost:3000/test?q=मैंने आज 500 रुपए खाने पर खर्च किए
```

## 🔧 Development

### Run in Dev Mode (with auto-reload)

```bash
npm run dev
```

### Project Scripts

```bash
npm start       # Start server
npm run dev     # Start with nodemon
npm run call    # Make test call
npm run ngrok   # Start ngrok
```

## 🧠 Agent Flow

```
User Voice Input
    ↓
Speech-to-Text (Twilio)
    ↓
Master Agent
    ├─ Detect Language (hi/en/ta/te)
    ├─ Detect Intent
    ├─ Map to Slave Agents
    └─ Orchestrate Execution
        ↓
Slave Agents (parallel/sequential)
    ├─ ExpenseAgent
    ├─ TaxAgent
    ├─ InvestmentAgent
    └─ IncomeAgent
        ↓
Master Agent
    ├─ Merge Responses
    ├─ Generate Final Answer
    └─ Translate to User's Language
        ↓
Text-to-Speech (Twilio)
    ↓
User hears response
```

## 🎨 Supported Intents

| Intent | Agents Used | Description |
|--------|-------------|-------------|
| `expense_logging` | ExpenseAgent | Log and categorize expenses |
| `tax_saving_advice` | TaxAgent | Get tax optimization tips |
| `invest_for_tax_saving` | InvestmentAgent, TaxAgent | Tax-saving investment advice |
| `income_vs_expenses` | IncomeAgent, ExpenseAgent | Budget analysis |
| `investment_advice` | InvestmentAgent | General investment suggestions |
| `financial_overview` | All Agents | Complete financial summary |

## 🌍 Language Support

- **Hindi** (hi) - Primary
- **English** (en)
- **Tamil** (ta)
- **Telugu** (te)

Auto-detection via LLM + Google Cloud TTS voices

## 📊 Tax Calculations

Based on Indian Income Tax Act (FY 2024-25):

- ✅ New Tax Regime (default)
- ✅ Old Tax Regime
- ✅ Section 80C, 80D, 80CCD(1B)
- ✅ Regime comparison
- ✅ Effective tax rate calculation

## 💼 Investment Recommendations

- **Conservative**: PPF, FD, Debt Funds
- **Moderate**: ELSS, Index Funds, NPS
- **Aggressive**: Equity MFs, Stocks

SIP projections with compounding returns

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ |
| `TWILIO_PHONE_NUMBER` | Your Twilio number | ✅ |
| `YOUR_PHONE_NUMBER` | Your personal number | ✅ |
| `GROQ_API_KEY` | Groq API key | ✅ |
| `NGROK_URL` | Ngrok HTTPS URL | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |

## 🐛 Troubleshooting

### Call not connecting?

1. Check Twilio webhook URL is correct
2. Ensure ngrok is running
3. Verify phone numbers are in E.164 format (+919876543210)

### "Authentication failed"?

- Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

### "Phone number not verified"?

- Verify `YOUR_PHONE_NUMBER` in Twilio console (for trial accounts)

### Agent not responding correctly?

- Check `GROQ_API_KEY` is valid
- Review server logs for errors

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/voice/incoming` | POST | Twilio webhook (incoming call) |
| `/voice/process` | POST | Twilio webhook (speech processing) |
| `/voice/status` | POST | Call status callbacks |
| `/test` | GET | Test agent without call |

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Voice**: Twilio Voice API
- **AI/LLM**: Groq (Llama 3.1)
- **Tunneling**: ngrok
- **Architecture**: Master-Slave Multi-Agent System

## 📚 Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express server with webhooks |
| `twilioAgent.js` | Twilio integration & voice handling |
| `makeCall.js` | Test script for outbound calls |
| `agents/master/masterAgent.js` | Main orchestrator |
| `agents/master/taskRouter.js` | Intent-to-agent mapping |
| `agents/master/collaborationManager.js` | Agent execution logic |
| `agents/master/languageManager.js` | Translation & language detection |
| `core/memoryStore.js` | In-memory data storage |
| `core/contextManager.js` | Conversation context |
| `core/eventBus.js` | Agent communication |

## 🚧 Roadmap

- [ ] Persistent database (MongoDB/Redis)
- [ ] User authentication
- [ ] SMS fallback
- [ ] Web dashboard
- [ ] Advanced analytics
- [ ] Multi-turn conversations
- [ ] Voice biometrics

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please open an issue first to discuss changes.

---

**Made with ❤️ using Master-Slave Agent Architecture**
