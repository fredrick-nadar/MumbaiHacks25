import dotenv from 'dotenv';
dotenv.config();

export const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  yourPhoneNumber: process.env.YOUR_PHONE_NUMBER,
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    // Best model for multilingual (Hindi, Tamil, Telugu, English)
    model: 'llama-3.3-70b-versatile', // Recommended for multilingual + reasoning
    // Alternative: 'llama-3.1-70b-versatile' or 'mixtral-8x7b-32768'
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    voiceName: process.env.ELEVENLABS_VOICE_NAME || 'tripti',
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  ngrokUrl: process.env.NGROK_URL,
};
