# 🚀 Quick Start Guide

Your TaxWise Voice System is almost ready! Here's the step-by-step flow to get everything running:

## ✅ **Already Completed:**
- ✅ Project structure created
- ✅ Dependencies installed (`npm install`)
- ✅ `.env` file configured with your credentials
- ✅ All code files ready

## 🎯 **Next Steps to Complete:**

### **Step 1: Seed Database** 📊
```bash
npm run seed
```
This creates test users with financial data for testing alerts.

### **Step 2: Start Your Server** 🖥️
```bash
npm run dev
```
Your server will start on `http://localhost:3001`

### **Step 3: Set Up ngrok (for local testing)** 🌐
```bash
# Install ngrok if you haven't already
ngrok http 3001
```
Copy your ngrok URL (something like `https://abc123.ngrok.io`)

### **Step 4: Update BASE_URL** ⚙️
Update your `.env` file:
```env
BASE_URL=https://abc123.ngrok.io
```

### **Step 5: Configure Twilio Webhooks** 📞

1. Go to [Twilio Console](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your number: `+17626752485`
3. In **Voice Configuration**:
   - **A call comes in**: Webhook
   - **HTTP POST**: `https://abc123.ngrok.io/voice/incoming`

### **Step 6: Set Up VAPI Agent Tool** 🤖

In your VAPI agent, add this tool:

**Tool Name**: `get_user_vitals`

**Configuration**:
- **Method**: POST
- **URL**: `https://abc123.ngrok.io/vapi/tool/query`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer supersecrettoken123",
    "Content-Type": "application/json"
  }
  ```

**Function Description**: "Get user's financial vitals including CIBIL score, utilization, and financial health data"

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "phone": {
      "type": "string",
      "description": "User's phone number in E.164 format"
    },
    "question": {
      "type": "string", 
      "description": "The financial question being asked"
    }
  },
  "required": ["phone", "question"]
}
```

### **Step 7: Configure VAPI SIP Connection** 🎙️

You need to get your actual VAPI SIP URI and update `.env`:

1. Go to your VAPI dashboard
2. Find your agent's SIP URI
3. Update `.env`:
```env
VAPI_SIP_URI=sip:your-actual-agent@your-subdomain.vapi.sip.global
```

### **Step 8: Test WhatsApp Sandbox** 💬

1. Go to [Twilio Console WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Send "join" message to the sandbox number from your WhatsApp (+917058513631)
3. This enables WhatsApp alerts to be sent to your number

## 🧪 **Testing Your System:**

### Test 1: Database & Server
```bash
npm run dev
```
Should see:
- ✅ MongoDB Connected
- ✅ Server running on port 3001
- ✅ Alerts scheduler initialized

### Test 2: VAPI Tool
```bash
curl -X POST http://localhost:3001/vapi/tool/query \
  -H "Authorization: Bearer supersecrettoken123" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917058513631", "question": "what is my cibil score?"}'
```

### Test 3: Voice Call
Call your Twilio number: **+17626752485**
- Should connect to your VAPI voice agent
- Agent should be able to access user data via the tool

### Test 4: WhatsApp Alert
```bash
# This will trigger a test alert to your WhatsApp
curl -X POST http://localhost:3001/test/alert
```

## 🎉 **You're Ready!**

Once all steps are complete:

1. **Users call +17626752485** → Connected to VAPI agent
2. **Agent can query financial data** via your tool
3. **System monitors financial health** daily at 9 AM IST
4. **Alerts sent to your WhatsApp** (+917058513631) when issues detected

## 📱 **Expected WhatsApp Alert Format:**

```
🚨 TaxWise Alert Monitor

User: Test User (+91 XXXXX XXXXX)
Alert: CIBIL_DROP
Severity: HIGH

🔴 CIBIL Alert: Your credit score dropped to 620 (was 700). This may affect your loan eligibility.

Time: 28/09/2025, 4:30:00 PM
```

## 🆘 **If You Have Issues:**

1. **MongoDB connection fails**: Check your MONGO_URI
2. **Twilio calls don't work**: Verify webhook URLs in Twilio console  
3. **VAPI tool fails**: Check Authorization header and BASE_URL
4. **WhatsApp not working**: Join the sandbox first

Your system is now ready to handle voice calls with AI and send real-time WhatsApp alerts! 🎙️📱