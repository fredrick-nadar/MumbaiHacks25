const rateLimit = require('express-rate-limit');
const config = require('../../config/env');

/**
 * Create rate limiter for password reset via Aadhaar
 * Limits: 3 attempts per day per user
 */
const passwordResetLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 24 hours
  max: config.rateLimitMaxRequests, // 3 attempts
  message: {
    status: 'error',
    message: 'Too many password reset attempts. Please try again tomorrow.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + user identifier if available
    const userKey = req.body?.aadhaarRefHash || req.user?.id || 'anonymous';
    return `password_reset:${req.ip}:${userKey}`;
  },
  skip: (req) => {
    // Skip rate limiting in development if disabled
    return !config.enableRateLimiting && config.nodeEnv === 'development';
  }
});

/**
 * Create rate limiter for login attempts
 * Limits: 5 attempts per hour per IP
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.maxLoginAttempts, // 5 attempts
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `login:${req.ip}`;
  },
  skip: (req) => {
    return !config.enableRateLimiting && config.nodeEnv === 'development';
  }
});

/**
 * Create rate limiter for KYC operations
 * Limits: 10 KYC attempts per hour per IP
 */
const kycLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Increased for testing - 1000 attempts
  message: {
    status: 'error',
    message: 'Too many KYC attempts. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `kyc:${req.ip}`;
  },
  skip: (req) => {
    // Always skip rate limiting for testing
    return true;
  }
});

/**
 * Create general API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `general:${req.ip}`;
  },
  skip: (req) => {
    return !config.enableRateLimiting && config.nodeEnv === 'development';
  }
});

/**
 * Create strict rate limiter for sensitive operations
 * Limits: 3 attempts per hour per IP
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    status: 'error',
    message: 'Too many attempts for this operation. Please try again in an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `strict:${req.ip}`;
  },
  skip: (req) => {
    return !config.enableRateLimiting && config.nodeEnv === 'development';
  }
});

/**
 * Custom rate limiter for specific operations
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
function createCustomLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 50, // 50 requests
    message = 'Too many requests',
    keyPrefix = 'custom',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      retryAfter: `${Math.round(windowMs / 60000)} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userKey = req.user?.id || 'anonymous';
      return `${keyPrefix}:${req.ip}:${userKey}`;
    },
    skipSuccessfulRequests,
    skipFailedRequests,
    skip: (req) => {
      return !config.enableRateLimiting && config.nodeEnv === 'development';
    }
  });
}

/**
 * Middleware to add rate limiting information to response headers
 */
function addRateLimitInfo(req, res, next) {
  res.setHeader('X-RateLimit-Policy', 'TaxWise API Rate Limiting');
  next();
}

module.exports = {
  passwordResetLimiter,
  loginLimiter,
  kycLimiter,
  generalLimiter,
  strictLimiter,
  createCustomLimiter,
  addRateLimitInfo
};