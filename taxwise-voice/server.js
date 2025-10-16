const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('./src/config/mongo');
const config = require('./src/config/env');
const alertsService = require('./src/services/alerts');

// Import routes
const voiceRoutes = require('./src/routes/voice-gemini'); // Gemini-based voice system only

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Don't log sensitive data
  const logData = {
    timestamp,
    method,
    url,
    ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  };
  
  // Log request (avoid logging sensitive routes in production)
  if (config.NODE_ENV === 'development' || !url.includes('/vapi/tool/')) {
    console.log(`📡 ${method} ${url}`, logData);
  }
  
  next();
});

// Health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TaxWise Voice System',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    endpoints: {
      voice: '/voice/*',
      health: '/'
    }
  });
});

// Mount routes - Gemini-based voice system only
app.use('/voice', voiceRoutes);

// Catch any requests that might be looking for old VAPI endpoints
app.all('/vapi/*', (req, res) => {
  res.status(404).json({
    error: 'VAPI endpoints have been removed. This system now uses Gemini AI.',
    message: 'Please use /voice/incoming for Twilio webhooks',
    timestamp: new Date().toISOString()
  });
});

// Test route for alerts (development only)
if (config.NODE_ENV === 'development') {
  app.post('/test/alert/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await alertsService.triggerTestAlert(userId);
      res.json({
        success: true,
        message: 'Test alert triggered',
        result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  app.get('/test/alerts/status', (req, res) => {
    const status = alertsService.getStatus();
    res.json({
      success: true,
      alertsService: status
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: config.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    method: req.method,
    url: req.originalUrl,
    availableEndpoints: {
      health: 'GET /',
      incomingCall: 'POST /voice/incoming',
      bridgeToVapi: 'POST /voice/bridge-to-vapi',
      callMe: 'POST /voice/call-me?userId=...',
      statusCallback: 'POST /voice/status-callback',
      vapiQuery: 'POST /vapi/tool/query',
      vapiHealth: 'GET /vapi/tool/health'
    }
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  // Stop alerts scheduler
  alertsService.stopScheduler();
  
  // Close server
  server.close(() => {
    console.log('📴 HTTP server closed');
    
    // Close database connection (handled by mongo.js)
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async () => {
  try {
    // Try to connect to database
    let dbConnected = false;
    try {
      await connectDB();
      console.log('✅ Database connected successfully');
      dbConnected = true;
      
      // Initialize alerts scheduler only if DB is connected
      alertsService.initAlertsScheduler(app);
    } catch (dbError) {
      console.warn('⚠️ Database connection failed, starting server without DB features:', dbError.message);
      console.warn('📞 Voice calls will still work, but user data features will be limited');
    }
    
    // Start HTTP server regardless of DB status
    const server = app.listen(config.PORT, () => {
      console.log('\n🚀 TaxWise Voice System Started Successfully!');
      console.log('=' .repeat(50));
      console.log(`🌐 Server: http://localhost:${config.PORT}`);
      console.log(`📞 Twilio Number: ${config.TWILIO_NUMBER}`);
      console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Disconnected (limited features)'}`);
      console.log(`🔔 Alerts: ${dbConnected ? 'Enabled (Daily at 9 AM IST)' : 'Disabled (No DB)'}`);
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
      console.log('=' .repeat(50));
      console.log('\n📡 Webhook URLs for Twilio:');
      console.log(`   Incoming Calls: ${config.BASE_URL}/voice/incoming`);
      console.log(`   Status Callback: ${config.BASE_URL}/voice/status-callback`);
      console.log('\n🤖 Gemini AI Configuration:');
      console.log(`   AI Engine: Google Gemini`);
      console.log(`   API Key: ${config.GEMINI_API_KEY ? config.GEMINI_API_KEY.substring(0, 8) + '...' : 'Not configured'}`);
      console.log('\n✨ System ready for intelligent voice calls with Gemini!');
      if (!dbConnected) {
        console.log('\n⚠️  Note: Database features are disabled. Voice calls will work normally.');
      }
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };