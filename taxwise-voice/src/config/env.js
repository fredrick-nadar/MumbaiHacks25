const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const requiredVars = [
  'MONGO_URI',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_NUMBER',
  'GEMINI_API_KEY',
  'BASE_URL'
];

// Validate required environment variables
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Environment configuration
const config = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL,

  // Database
  MONGO_URI: process.env.MONGO_URI,

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER: process.env.TWILIO_NUMBER,
  TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID,

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Alerts
  WHATSAPP_FROM: process.env.WHATSAPP_FROM || 'whatsapp:+14155238886',
  ALERTS_SMS_FROM: process.env.ALERTS_SMS_FROM || process.env.TWILIO_NUMBER,
  CIBIL_THRESHOLD: parseInt(process.env.CIBIL_THRESHOLD) || 650,
  CALL_ME_RATE_LIMIT_MIN: parseInt(process.env.CALL_ME_RATE_LIMIT_MIN) || 5,
  YOUR_WHATSAPP_NUMBER: process.env.YOUR_WHATSAPP_NUMBER
};

console.log('✅ Environment configuration loaded successfully');
console.log(`🌍 Environment: ${config.NODE_ENV}`);
console.log(`🔧 Server will run on port: ${config.PORT}`);
console.log(`📞 Twilio number: ${config.TWILIO_NUMBER}`);
console.log(`🤖 AI Engine: Gemini (Google) - VAPI completely removed`);

module.exports = config;