# TaxWise Voice System 🎙️

A comprehensive voice AI system that integrates Twilio telephony with VAPI voice agents for financial advisory services. The system includes automated alerts, real-time user queries, and seamless voice interactions.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     User        │    │     Twilio      │    │   VAPI Agent    │
│   📞 Calls      │◄──►│   📞 Voice      │◄──►│   🤖 AI Voice   │
│                 │    │   📱 Messaging  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TaxWise Voice Server                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Voice     │  │    VAPI     │  │       Alerts            │  │
│  │  Routes     │  │   Tools     │  │    (Cron Jobs)          │  │
│  │             │  │ (MongoDB    │  │                         │  │
│  │ • Incoming  │  │  Queries)   │  │ • CIBIL Drop            │  │
│  │ • Outbound  │  │             │  │ • Spend Spike           │  │
│  │ • Bridge    │  │             │  │ • SMS/WhatsApp          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │    MongoDB      │
                     │                 │
                     │ • Users         │
                     │ • Alerts        │
                     │ • Call Logs     │
                     └─────────────────┘
```

## 🚀 Features

### 📞 Voice System
- **Inbound Calls**: Automatic bridging to VAPI voice agent
- **Outbound Calls**: Rate-limited call-me functionality
- **Real-time Status**: Call lifecycle tracking and logging

### 🤖 AI Integration
- **VAPI Tools**: Secure webhook for user data queries
- **Smart Routing**: Context-aware financial question answering
- **Authentication**: Bearer token security for tool access

### 🚨 Alert System
- **Automated Monitoring**: Daily cron jobs for financial health
- **Multi-channel Notifications**: SMS, WhatsApp, and voice calls
- **Smart Alerts**: CIBIL drops, spending spikes, high utilization
- **Admin Monitoring**: WhatsApp notifications to your personal number

### 🔒 Security
- **Environment-based Configuration**: All secrets in .env
- **Token Authentication**: Secured VAPI tool endpoints
- **Data Privacy**: No PII in logs, phone number masking

## 📁 Project Structure

```
taxwise-voice/
├── server.js                 # Main Express server
├── seed.js                   # Database seeding script
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
└── src/
    ├── config/
    │   ├── env.js            # Environment configuration
    │   └── mongo.js          # MongoDB connection
    ├── models/
    │   ├── User.js           # User data model
    │   └── Alert.js          # Alert data model
    ├── routes/
    │   ├── voice.js          # Voice handling routes
    │   └── vapiTools.js      # VAPI webhook routes
    └── services/
        ├── twilioClient.js   # Twilio service wrapper
        └── alerts.js         # Alert system and cron jobs
```

## ⚙️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd d:\Programming\BitNBuild-25_GRIND\taxwise-voice
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your credentials:

```bash
cp .env.example .env
```

Update `.env` with your actual credentials:

```env
PORT=3001
BASE_URL=https://your-ngrok-url.ngrok.io

# MongoDB
MONGO_URI=mongodb://localhost:27017/taxwise-voice

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_NUMBER=+1XXXXXXXXXX

# VAPI Configuration (choose one method)
VAPI_SIP_URI=sip:agent-123@your-subdomain.vapi.sip.global
# OR for WebSocket:
# VAPI_WS_URL=wss://stream.vapi.ai/twilio?agentId=YOUR_AGENT_ID
# VAPI_WS_AUTH_HEADER=Bearer YOUR_VAPI_STREAM_TOKEN

# Tool Authentication
VAPI_TOOL_TOKEN=your-secret-token-here

# Alert Configuration
WHATSAPP_FROM=whatsapp:+14155238886
ALERTS_SMS_FROM=+1XXXXXXXXXX
YOUR_WHATSAPP_NUMBER=+91XXXXXXXXXX  # Your number for admin alerts
CIBIL_THRESHOLD=650
```

### 3. Database Setup

Ensure MongoDB is running, then seed the database:

```bash
npm run seed
```

### 4. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## 🔧 Twilio Configuration

### Step 1: Purchase a Voice-Enabled Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Select a number with **Voice** and **SMS** capabilities

### Step 2: Configure Webhooks

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your purchased number
3. In the **Voice & Fax** section:
   - **A CALL COMES IN**: Webhook
   - **HTTP POST** to: `https://your-ngrok-url.ngrok.io/voice/incoming`

4. In the **Messaging** section:
   - **A MESSAGE COMES IN**: Webhook  
   - **HTTP POST** to: `https://your-ngrok-url.ngrok.io/messaging/webhook` (if needed)

### Step 3: WhatsApp Sandbox (for testing)

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join the sandbox
3. Use sandbox number as `WHATSAPP_FROM` in your .env

## 🤖 VAPI Agent Configuration

### Tool Configuration

Add this tool to your VAPI agent:

**Tool Name**: `get_user_vitals`

**Configuration**:
- **Method**: POST
- **URL**: `https://your-ngrok-url.ngrok.io/vapi/tool/query`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer your-secret-token-here",
    "Content-Type": "application/json"
  }
  ```

**Request Body Schema**:
```json
{
  "phone": "+91XXXXXXXXXX",
  "question": "what's my cibil score and utilization?"
}
```

**Response Schema**:
```json
{
  "text": "Your estimated CIBIL score is 620. Your credit utilization is 75%.",
  "data": {
    "found": true,
    "cibilScore": 620,
    "utilization": 75,
    "category": "cibil"
  }
}
```

### Agent Prompting

Configure your VAPI agent with this system prompt:

```
You are a helpful financial advisor assistant for TaxWise. You can access user's financial data through tools.

IMPORTANT AUTHENTICATION:
- Before accessing sensitive financial data, ask users to confirm their phone number
- For security, you may ask for last 2 digits of year of birth if needed

CAPABILITIES:
- Check CIBIL/credit scores
- Review credit utilization  
- Analyze income vs expenses
- Provide finance score insights
- Give personalized financial advice

CONVERSATION FLOW:
1. Greet warmly and ask how you can help
2. If they ask about financial data, verify their phone number
3. Use the get_user_vitals tool to fetch their information
4. Provide clear, helpful explanations of their financial health
5. Offer actionable advice based on their data

Be conversational, supportive, and focused on helping users improve their financial health.
```

## 🧪 Testing Guide

### 1. Test Database Seeding

```bash
npm run seed
```

Expected output: Users created with test data, including one user with low CIBIL score for alert testing.

### 2. Test Server Startup

```bash
npm run dev
```

Expected output:
- ✅ Database connected
- ✅ Server running on port 3001
- ✅ Alerts scheduler initialized

### 3. Test Inbound Calls

1. **Setup ngrok** (for local testing):
   ```bash
   ngrok http 3001
   ```

2. **Configure Twilio webhook** with your ngrok URL

3. **Call your Twilio number** → Should connect to VAPI agent

### 4. Test Outbound Calls

```bash
# Replace USER_ID with actual user ID from seed output
curl -X POST "http://localhost:3001/voice/call-me?userId=USER_ID"
```

Expected: Call initiated to user's phone number

### 5. Test VAPI Tool Integration

```bash
curl -X POST http://localhost:3001/vapi/tool/query \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+91XXXXXXXXXX",
    "question": "what is my cibil score?"
  }'
```

Expected response:
```json
{
  "success": true,
  "text": "Your estimated CIBIL score is 620, which is considered fair...",
  "data": {
    "found": true,
    "cibilScore": 620,
    "category": "cibil"
  }
}
```

### 6. Test Alert System

```bash
# Trigger test alert (development only)
curl -X POST http://localhost:3001/test/alert/USER_ID
```

Expected: SMS and WhatsApp notifications sent

### 7. Test Alert Status

```bash
curl http://localhost:3001/test/alerts/status
```

Expected: Alert scheduler status information

## 📱 WhatsApp Admin Monitoring

The system automatically sends WhatsApp notifications to `YOUR_WHATSAPP_NUMBER` whenever alerts are triggered, providing:

- User details (name, phone)
- Alert type and severity
- Timestamp
- Alert message content

Example admin notification:
```
🚨 TaxWise Alert Monitor

User: Fredrick Marsh (+91 XXXXX XXXXX)
Alert: CIBIL_DROP
Severity: HIGH

🔴 CIBIL Alert: Your credit score dropped to 620 (was 700). This may affect your loan eligibility.

Time: 28/09/2025, 2:30:00 PM
```

## 🚨 Alert Types

The system monitors and alerts for:

1. **CIBIL_DROP**: Credit score below threshold (650)
2. **SPEND_SPIKE**: Monthly expenses >90% of income
3. **UTILIZATION_HIGH**: Credit utilization >70%
4. **FINANCE_SCORE_LOW**: Overall finance score <60
5. **MANUAL_ALERT**: Test/manual alerts

## 📊 Monitoring & Logs

### Console Logging

The system provides comprehensive logging:

```
✅ MongoDB Connected: localhost:27017
📞 Incoming call received: CallSid=CA123...
🤖 VAPI tool query: userId=507f1f77bcf86cd799439011
🚨 Processing CIBIL_DROP alert for user Fredrick Marsh
📱 SMS sent to +91 XXXXX XXXXX: SM123...
💬 WhatsApp sent to user +91 XXXXX XXXXX
```

### Call Status Tracking

All call lifecycle events are logged:
- 🟡 Call initiated
- 🔔 Call ringing  
- 🟢 Call answered
- ✅ Call completed

## 🔒 Security Features

1. **Environment Variables**: All secrets stored in .env
2. **Bearer Token Auth**: VAPI tools secured with shared secret
3. **Phone Number Masking**: PII protected in logs
4. **Rate Limiting**: Call-me endpoint has built-in rate limiting
5. **Input Validation**: All inputs validated and sanitized

## 🚀 Production Deployment

### 1. Environment Setup

- Use production MongoDB instance
- Configure production Twilio numbers
- Set up proper domain for BASE_URL
- Use strong VAPI_TOOL_TOKEN

### 2. Process Management

Consider using PM2 for production:

```bash
npm install -g pm2
pm2 start server.js --name "taxwise-voice"
pm2 save
pm2 startup
```

### 3. Reverse Proxy

Use nginx for HTTPS and load balancing:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **"MongoDB connection failed"**
   - Ensure MongoDB is running
   - Check MONGO_URI in .env

2. **"Call failed to connect to VAPI"**
   - Verify VAPI_SIP_URI or VAPI_WS_URL
   - Check VAPI agent is online
   - Ensure Twilio can reach your webhook URLs

3. **"VAPI tool authentication failed"**
   - Verify VAPI_TOOL_TOKEN matches in both .env and VAPI agent
   - Check Authorization header format

4. **"WhatsApp messages not sending"**
   - Ensure you've joined Twilio WhatsApp sandbox
   - Verify WHATSAPP_FROM number
   - Check recipient number format (+countrycode)

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development npm run dev
```

## 📞 Support

For issues and questions:

1. Check the logs for error details
2. Verify all environment variables are set correctly
3. Test individual components (database, Twilio, VAPI) separately
4. Use the test endpoints to isolate issues

## 🎉 Success! 

Your TaxWise Voice System is now ready to:

- 📞 Handle inbound voice calls with AI agent
- 🤖 Provide real-time financial data through voice
- 🚨 Send automated alerts via SMS/WhatsApp
- 📊 Monitor user financial health continuously
- 💬 Keep you informed through WhatsApp notifications

The system will automatically monitor your users' financial vitals and alert them (and you) when attention is needed!