const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../../config/env');
const User = require('../../models/User');
const LoginEvent = require('../../models/LoginEvent');

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {string} JWT token
 */
function generateToken(user, type = 'access') {
  const payload = {
    userId: user._id,
    nameLoginKey: user.nameLoginKey,
    type,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const options = {
    expiresIn: type === 'refresh' ? config.jwtRefreshExpiresIn : config.jwtExpiresIn
  };
  
  return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Generate access and refresh token pair
 * @param {Object} user - User object
 * @returns {Object} Token pair
 */
function generateTokenPair(user) {
  return {
    accessToken: generateToken(user, 'access'),
    refreshToken: generateToken(user, 'refresh'),
    expiresIn: config.jwtExpiresIn
  };
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} JWT token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = config.bcryptRounds || 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Verification result
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate secure random string
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate session ID for KYC
 * @returns {string} Session ID
 */
function generateKycSessionId() {
  const timestamp = Date.now().toString(36);
  const random = generateSecureRandom(8);
  return `kyc_${timestamp}_${random}`;
}

/**
 * Generate API key for external integrations
 * @param {string} prefix - Prefix for API key
 * @returns {string} API key
 */
function generateApiKey(prefix = 'tw') {
  const timestamp = Date.now().toString(36);
  const random = generateSecureRandom(16);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Hash sensitive data with salt
 * @param {string} data - Data to hash
 * @param {string} salt - Salt value
 * @returns {string} Hashed data
 */
function hashWithSalt(data, salt) {
  return crypto.createHash('sha256').update(salt + data).digest('hex');
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
function createHmacSignature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature
 * @param {string} secret - Secret key
 * @returns {boolean} Verification result
 */
function verifyHmacSignature(data, signature, secret) {
  const expectedSignature = createHmacSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Log authentication event
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} metadata - Additional metadata
 * @param {Object} req - Express request object
 */
async function logAuthEvent(userId, action, metadata = {}, req = {}) {
  try {
    const mongoose = require('mongoose');
    
    // Extract IP address from various sources
    const getClientIP = (request) => {
      return request.ip || 
             request.connection?.remoteAddress || 
             request.socket?.remoteAddress ||
             (request.headers ? request.headers['x-forwarded-for'] : null) ||
             (request.headers ? request.headers['x-real-ip'] : null) ||
             '127.0.0.1'; // fallback to localhost
    };

    // Validate userId if provided
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('Invalid userId provided to logAuthEvent:', userId, 'typeof:', typeof userId);
      userId = null; // Set to null if invalid
    }

    const eventData = {
      action,
      ip: getClientIP(req),
      userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'] || 'Unknown',
      success: metadata.success !== false,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        sessionId: req.sessionID || metadata.sessionId,
        isUnknownUser: !userId // flag to indicate this was an unknown user
      }
    };

    // Only set userId if it exists and is valid
    if (userId) {
      eventData.userId = userId;
    }

    const event = new LoginEvent(eventData);
    await event.save();
  } catch (error) {
    console.error('Failed to log auth event:', error);
    console.error('Error details:', {
      userId,
      action,
      errorMessage: error.message,
      errorName: error.name
    });
    // Don't throw error to avoid breaking auth flow
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePasswordStrength(password) {
  const result = {
    isValid: true,
    score: 0,
    issues: []
  };
  
  if (!password || password.length < 6) {
    result.isValid = false;
    result.issues.push('Password must be at least 6 characters long');
  }
  
  // Check for common patterns
  if (password.length >= 6) {
    result.score += 1;
  }
  
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.issues.push('Password should contain uppercase letters');
  }
  
  if (/[0-9]/.test(password)) {
    result.score += 1;
  } else {
    result.issues.push('Password should contain numbers');
  }
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  }
  
  // Check for common weak passwords
  const weakPasswords = ['123456', 'password', 'qwerty', 'admin'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    result.isValid = false;
    result.issues.push('Password contains common weak patterns');
  }
  
  return result;
}

/**
 * Create secure headers for responses
 * @param {Object} res - Express response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
}

/**
 * Sanitize sensitive data from logs
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeForLogs(data) {
  const sensitive = ['password', 'token', 'aadhaar', 'pan', 'phone', 'email'];
  const sanitized = { ...data };
  
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}

module.exports = {
  generateToken,
  generateTokenPair,
  verifyToken,
  extractTokenFromHeader,
  hashPassword,
  verifyPassword,
  generateSecureRandom,
  generateKycSessionId,
  generateApiKey,
  hashWithSalt,
  createHmacSignature,
  verifyHmacSignature,
  logAuthEvent,
  validatePasswordStrength,
  setSecurityHeaders,
  sanitizeForLogs
};