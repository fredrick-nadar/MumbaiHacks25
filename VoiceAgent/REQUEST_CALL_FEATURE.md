# 📞 Request AI Call Feature - Setup Guide

## ✅ What Was Added

### 1. **Backend API Endpoint** (`VoiceAgent/routes/call.js`)
- **POST** `/api/call/request` - Triggers outbound call via Twilio
- **GET** `/api/call/status/:callSid` - Check call status

### 2. **Frontend Button Component** (`Frontend/src/components/dashboard/RequestCallButton.jsx`)
- Beautiful animated button with 4 states:
  - **Idle**: "Request AI Call" (Sky blue gradient)
  - **Loading**: "Connecting..." (Gray with spinner)
  - **Success**: "Call Incoming!" (Green gradient)
  - **Error**: Shows error message (Red gradient)

### 3. **Dashboard Integration** (`Frontend/src/pages/dashboard/DashboardOverview.jsx`)
- Button placed next to "CIBIL score advisor" title
- Fully responsive and matches your design system

---

## 🚀 How to Use

### Step 1: Start VoiceAgent Server
```bash
cd VoiceAgent
node server.js
```

**Expected Output:**
```
============================================================
🚀 HCM-AFIS Voice Agent Server Started
============================================================
📡 Server running on port: 3000
🌐 Local URL: http://localhost:3000

📞 Twilio Webhook URL (after ngrok):
   https://your-ngrok-url.ngrok-free.app/voice/incoming
============================================================
```

### Step 2: Start ngrok (In Another Terminal)
```bash
cd VoiceAgent
ngrok http 3000
```

Copy the `https://` URL and update `.env`:
```env
NGROK_URL=https://abc123.ngrok-free.app
```

### Step 3: Start Frontend
```bash
cd Frontend
npm run dev
```

### Step 4: Click the Button!
1. Navigate to: `http://localhost:5173/dashboard/overview`
2. Find the **"Request AI Call"** button next to "CIBIL score advisor"
3. Click it!
4. Your phone will ring within 5-10 seconds 🔔

---

## 🎯 How It Works

```
┌─────────────────┐
│  Frontend UI    │
│  (React)        │
└────────┬────────┘
         │ Click "Request AI Call"
         ▼
┌─────────────────────────────────────────┐
│  POST http://localhost:3000/api/call/   │
│  request                                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  VoiceAgent Server                      │
│  routes/call.js                         │
│  • Validates phone number               │
│  • Checks ngrok URL                     │
│  • Calls Twilio API                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Twilio Voice API                       │
│  • Dials your number                    │
│  • Fetches TwiML from webhook           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  /voice/incoming webhook                │
│  twilioAgent.js                         │
│  • Greets in Hindi                      │
│  • Gathers speech input                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Master Agent                           │
│  • Detects intent                       │
│  • Routes to Slave Agent                │
│  • Returns AI response                  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  /voice/process webhook                 │
│  • Speaks AI response                   │
│  • Asks for more input                  │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Phone Number Setup
Default phone number is from `.env`:
```env
YOUR_PHONE_NUMBER=+917058513631
```

**To override per-request**, modify the button component:
```javascript
// In RequestCallButton.jsx
body: JSON.stringify({
  phoneNumber: '+919876543210'  // Custom number
}),
```

---

## 🎨 Button States

### 1. **Idle State** (Default)
```jsx
<Button className="bg-gradient-to-r from-sky-500 to-cyan-500">
  <Phone /> Request AI Call
</Button>
```

### 2. **Loading State** (Calling Twilio)
```jsx
<Button className="bg-slate-400" disabled>
  <Loader2 className="animate-spin" /> Connecting...
</Button>
```

### 3. **Success State** (Call Initiated)
```jsx
<Button className="bg-gradient-to-r from-emerald-500 to-green-500" disabled>
  <CheckCircle2 /> Call Incoming!
</Button>
```
*Auto-resets to idle after 5 seconds*

### 4. **Error State** (Failed)
```jsx
<Button className="bg-gradient-to-r from-rose-500 to-red-500" disabled>
  <AlertCircle /> Network error...
</Button>
```
*Auto-resets to idle after 5 seconds*

---

## 🐛 Troubleshooting

### Error: "Network error. Is VoiceAgent server running?"
**Solution**: 
```bash
cd VoiceAgent
node server.js
```

### Error: "Phone number not configured"
**Solution**: Check `VoiceAgent/.env`:
```env
YOUR_PHONE_NUMBER=+917058513631
```

### Error: "Server webhook URL not configured"
**Solution**: 
1. Run `ngrok http 3000`
2. Copy the https URL
3. Update `.env`: `NGROK_URL=https://abc123.ngrok-free.app`
4. Restart server

### Error: "Authentication failed"
**Solution**: Verify Twilio credentials in `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+17626752485
```

### Button Not Appearing
**Solution**: Clear browser cache and restart frontend:
```bash
cd Frontend
npm run dev
```

---

## 📱 Expected User Experience

1. **User clicks "Request AI Call"**
   - Button shows "Connecting..." with spinner
   
2. **Within 5-10 seconds**
   - Phone rings 📱
   - Button shows "Call Incoming!" in green
   
3. **User answers call**
   - Hears: "नमस्ते! मैं आपका वित्तीय सहायक हूँ..."
   - Can speak in Hindi/Tamil/Telugu/English
   
4. **AI responds**
   - Master Agent processes query
   - Routes to appropriate Slave Agent (Expense/Tax/Investment/Income)
   - Speaks response in user's language

5. **Conversation continues**
   - Can ask multiple questions
   - Hangs up when done

---

## 🔐 Security Notes

- API endpoint has **NO authentication** (add JWT for production)
- CORS is enabled for `http://localhost:5173`
- Phone numbers should be validated server-side
- Consider rate limiting for production

---

## 🎉 What Happens When You Click

```javascript
// 1. Frontend sends request
fetch('http://localhost:3000/api/call/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

// 2. Backend creates Twilio call
await client.calls.create({
  from: '+17626752485',
  to: '+917058513631',
  url: 'https://ngrok-url.ngrok-free.app/voice/incoming'
})

// 3. Twilio dials your number
// 4. You answer
// 5. Twilio fetches /voice/incoming
// 6. TwiML greeting plays
// 7. Speech input gathered
// 8. Master Agent processes
// 9. AI response spoken
// 10. Conversation continues
```

---

## 🚀 Next Steps

### Enhance Button Functionality
1. **Add phone number input modal**
2. **Show call history**
3. **Display real-time call status**
4. **Add call recording playback**

### Production Readiness
1. **Add authentication (JWT)**
2. **Implement rate limiting**
3. **Add phone number validation**
4. **Deploy to cloud (Heroku, AWS, Azure)**
5. **Use production webhook URL**

---

## ✨ Credits

Built with:
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express.js + Twilio
- **AI**: Groq (llama-3.3-70b-versatile) + Master-Slave Architecture
- **Voice**: Twilio Voice API + ElevenLabs TTS

---

**Need help?** Check the console logs for detailed error messages! 🛠️
