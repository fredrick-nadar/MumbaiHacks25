/**
 * Server - Express server with Twilio webhooks
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectDB } from './config/database.js';
import {
  handleIncomingCall,
  processVoiceInput,
  handleCallStatus,
  testAgent,
} from './twilioAgent.js';
import callRoutes from './routes/call.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve audio files statically
app.use('/audio', express.static(path.join(__dirname, 'audio_cache')));

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

// API Routes
app.use('/api/call', callRoutes);

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
app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HCM-AFIS Voice Agent Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`\n📞 Twilio Webhook URL (after ngrok):`);
  console.log(`   ${config.ngrokUrl || '<Set NGROK_URL in .env>'}/voice/incoming`);
  console.log(`\n🧪 Test endpoint:`);
  console.log(`   http://localhost:${PORT}/test?q=your_query_here`);
  
  // Connect to MongoDB
  console.log('\n' + '-'.repeat(60));
  await connectDB();
  console.log('-'.repeat(60));
  
  console.log('\n💡 Next steps:');
  console.log('   1. Run: ngrok http 3000');
  console.log('   2. Copy ngrok URL to .env as NGROK_URL');
  console.log('   3. Update Twilio webhook with: <ngrok-url>/voice/incoming');
  console.log('   4. Run: node makeCall.js to test\n');
  console.log('='.repeat(60) + '\n');
});

export default app;
