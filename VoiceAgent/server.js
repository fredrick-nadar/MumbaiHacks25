/**
 * Server - Express server with Twilio webhooks
 */

import express from 'express';
import bodyParser from 'body-parser';
import { config } from './config/env.js';
import {
  handleIncomingCall,
  processVoiceInput,
  handleCallStatus,
  testAgent,
} from './twilioAgent.js';

const app = express();
const PORT = config.server.port;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'HCM-AFIS Voice Agent',
    timestamp: new Date().toISOString(),
  });
});

// Twilio webhooks
app.post('/voice/incoming', handleIncomingCall);
app.post('/voice/process', processVoiceInput);
app.post('/voice/status', handleCallStatus);

// Test endpoint
app.get('/test', testAgent);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HCM-AFIS Voice Agent Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`\n📞 Twilio Webhook URL (after ngrok):`);
  console.log(`   ${config.ngrokUrl || '<Set NGROK_URL in .env>'}/voice/incoming`);
  console.log(`\n🧪 Test endpoint:`);
  console.log(`   http://localhost:${PORT}/test?q=your_query_here`);
  console.log('='.repeat(60) + '\n');
  console.log('💡 Next steps:');
  console.log('   1. Run: ngrok http 3000');
  console.log('   2. Copy ngrok URL to .env as NGROK_URL');
  console.log('   3. Update Twilio webhook with: <ngrok-url>/voice/incoming');
  console.log('   4. Run: node makeCall.js to test\n');
});

export default app;
