require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const aadhaarAuthRoutes = require('./routes/aadhaar-auth');
const kycRoutes = require('./routes/kyc');
const dataRoutes = require('./routes/data');
const transactionRoutes = require('./routes/transactions');
const taxRoutes = require('./routes/tax');
const creditRoutes = require('./routes/credit');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const insuranceRoutes = require('./routes/insurance');
const predictionsRoutes = require('./routes/predictions');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken, authenticate } = require('./middleware/auth');
const { generalLimiter } = require('./services/security/rateLimit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - enables req.ip to work properly
app.set('trust proxy', true);

// Connect to MongoDB
connectDB();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Security middleware
app.use(helmet());

// Rate limiting - use our comprehensive rate limiting service
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'], // React dev servers
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TaxWise API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      aadhaarAuth: true,
      kycVerification: true,
      rateLimit: true,
      fileUpload: true
    }
  });
});

// Aadhaar Auth System Info
app.get('/api/aadhaar-auth/info', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TaxWise Aadhaar Authentication System',
    version: '1.0.0',
    features: {
      registration: 'Aadhaar QR/XML based registration',
      login: 'Name + generated password login',
      passwordReset: 'Aadhaar re-verification based reset',
      security: 'JWT tokens, rate limiting, audit trails'
    },
    endpoints: {
      kyc: {
        qrParse: 'POST /api/kyc/aadhaar/qr-parse',
        xmlParse: 'POST /api/kyc/aadhaar/xml-parse',
        complete: 'POST /api/kyc/aadhaar/complete',
        status: 'GET /api/kyc/aadhaar/status/:sessionId'
      },
      auth: {
        login: 'POST /api/aadhaar-auth/login',
        me: 'GET /api/aadhaar-auth/me',
        refresh: 'POST /api/aadhaar-auth/refresh',
        passwordResetQR: 'POST /api/aadhaar-auth/password-reset/qr',
        passwordResetXML: 'POST /api/aadhaar-auth/password-reset/xml',
        logout: 'POST /api/aadhaar-auth/logout',
        loginHistory: 'GET /api/aadhaar-auth/login-history'
      }
    }
  });
});

// API routes
app.use('/api/auth', authRoutes); // Legacy auth routes
app.use('/api/aadhaar-auth', aadhaarAuthRoutes); // New Aadhaar-based authentication
app.use('/api/kyc', kycRoutes); // KYC verification routes
app.use('/api/data', authenticateToken, dataRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/tax', authenticateToken, taxRoutes);
app.use('/api/credit', authenticateToken, creditRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/insurance', authenticateToken, insuranceRoutes); // Blockchain-enabled insurance
app.use('/api/predictions', authenticateToken, predictionsRoutes); // AI-powered predictions

// Catch 404 and forward to error handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 TaxWise server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
