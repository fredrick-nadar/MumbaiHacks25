# 🚀 Quick Start Guide

## Complete Setup in 5 Minutes

### 1️⃣ Install Dependencies

```powershell
npm install
```

### 2️⃣ Get API Keys

#### Twilio (Free Trial)
1. Sign up: https://www.twilio.com/try-twilio
2. Get a phone number (free trial)
3. Copy credentials from https://console.twilio.com:
   - Account SID
   - Auth Token
   - Your Twilio phone number

#### Groq (Free)
1. Sign up: https://console.groq.com
2. Create API key
3. Copy the key

### 3️⃣ Configure .env

Copy the example file:
```powershell
Copy-Item .env.example .env
```

Edit `.env` with your values:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+919876543210
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
NGROK_URL=
```

### 4️⃣ Install ngrok

```powershell
# If not installed, download from: https://ngrok.com/download
# Or use chocolatey:
choco install ngrok
```

### 5️⃣ Start Everything

**Terminal 1** (Start Server):
```powershell
npm start
```

**Terminal 2** (Start ngrok):
```powershell
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

Update `.env`:
```env
NGROK_URL=https://abc123.ngrok.io
```

**Restart server** (Ctrl+C in Terminal 1, then `npm start` again)

### 6️⃣ Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your phone number
3. Under "Voice Configuration" → "A Call Comes In":
   ```
   https://your-ngrok-url.ngrok.io/voice/incoming
   ```
4. Set to **POST**
5. Save

### 7️⃣ Make Test Call

```powershell
npm run call
```

Your phone will ring! 📞

## 🎯 Test Commands

Try saying (in Hindi):
- "मैंने आज 500 रुपए खाने पर खर्च किए"
- "Tax कैसे बचाऊं?"
- "निवेश की सलाह दो"

Or in English:
- "I spent 500 rupees on food today"
- "How can I save tax?"
- "Give me investment advice"

## 🧪 Test Without Calling

Open browser:
```
http://localhost:3000/test?q=मैंने आज 500 रुपए खाने पर खर्च किए
```

## ❗ Common Issues

### Call not working?
- Check ngrok is running
- Verify Twilio webhook URL is correct
- Ensure phone numbers are in E.164 format (+country+number)

### Authentication error?
- Double-check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env

### Phone not verified?
- For Twilio trial accounts, verify YOUR_PHONE_NUMBER at:
  https://console.twilio.com/us1/develop/phone-numbers/manage/verified

## 📚 Next Steps

- Read the full [README.md](README.md)
- Explore agent logic in `agents/` folder
- Customize prompts in `core/prompts.js`
- Add your own financial data

---

**Need help?** Check the README or server logs for details.
