const dotenv = require('dotenv');
dotenv.config();

const config = {
  // Database
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/taxwise',
  
  // Server
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: '7d',
  jwtRefreshExpiresIn: '30d',
  
  // Aadhaar Security
  aadhaarSalt: process.env.AADHAAR_SALT || 'default-aadhaar-salt',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // Password Management
  revealPasswordOnRegistration: process.env.REVEAL_PASSWORD_ON_REGISTRATION === 'true',
  allowPlainResetPasswordOnDev: process.env.ALLOW_PLAIN_RESET_PASSWORD_ON_DEV === 'true',
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 2097152, // 2MB
  allowedFileTypesQR: (process.env.ALLOWED_FILE_TYPES_QR || 'image/png,image/jpeg,image/jpg').split(','),
  allowedFileTypesXML: (process.env.ALLOWED_FILE_TYPES_XML || 'application/xml,text/xml').split(','),
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 86400000, // 24 hours
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 3,
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  
  // Optional Features
  enableIpGeo: process.env.ENABLE_IP_GEO === 'true',
  
  // Session
  kycSessionExpiryHours: 2,
};

// Validation
if (!config.jwtSecret || config.jwtSecret === 'replace-me' || config.jwtSecret === 'fallback-secret-key') {
  console.warn('⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable.');
}

if (!config.aadhaarSalt || config.aadhaarSalt === 'default-aadhaar-salt') {
  console.warn('⚠️  Warning: Using default Aadhaar salt. Set AADHAAR_SALT environment variable.');
}

module.exports = config;