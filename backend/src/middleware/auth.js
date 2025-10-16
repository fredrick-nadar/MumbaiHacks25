const { verifyToken, extractTokenFromHeader, logAuthEvent, setSecurityHeaders } = require('../services/security/auth');
const User = require('../models/User');
const config = require('../config/env');

/**
 * Authentication middleware - verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function authenticate(req, res, next) {
  try {
    setSecurityHeaders(res);
    
    const authHeader = req.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type'
      });
    }
    
    // Find user by ID and nameLoginKey for additional security
    const user = await User.findOne({
      _id: decoded.userId,
      nameLoginKey: decoded.nameLoginKey
    });
    
    if (!user) {
      await logAuthEvent(decoded.userId, 'auth_failed', {
        reason: 'user_not_found',
        tokenUsed: true
      }, req);
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid user token'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      await logAuthEvent(user._id, 'auth_failed', {
        reason: 'user_inactive',
        tokenUsed: true
      }, req);
      
      return res.status(401).json({
        status: 'error',
        message: 'Account is inactive'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message.includes('Invalid token')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
}

// Legacy function for backward compatibility
const authenticateToken = authenticate;

/**
 * Optional authentication middleware - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    setSecurityHeaders(res);
    
    const authHeader = req.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return next(); // Continue without authentication
    }
    
    const user = await User.findOne({
      _id: decoded.userId,
      nameLoginKey: decoded.nameLoginKey,
      isActive: true
    });
    
    if (user) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication on any error
    next();
  }
}

/**
 * Admin role middleware - requires admin privileges
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'admin') {
      await logAuthEvent(req.user._id, 'auth_failed', {
        reason: 'insufficient_privileges',
        requiredRole: 'admin',
        userRole: req.user.role
      }, req);
      
      return res.status(403).json({
        status: 'error',
        message: 'Admin privileges required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
}

/**
 * KYC completion middleware - requires completed KYC
 */
async function requireKycCompleted(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (req.user.kycStatus !== 'completed') {
      return res.status(403).json({
        status: 'error',
        message: 'KYC verification required',
        data: {
          kycStatus: req.user.kycStatus,
          redirectTo: '/kyc/aadhaar'
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('KYC check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'KYC verification failed'
    });
  }
}

/**
 * Request validation middleware - basic input validation
 */
function validateRequest(requiredFields = []) {
  return (req, res, next) => {
    try {
      setSecurityHeaders(res);
      
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields',
          data: {
            missingFields
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Request validation error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Request validation failed'
      });
    }
  };
}

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

module.exports = {
  authenticate,
  authenticateToken, // Legacy support
  optionalAuth,
  requireAdmin,
  requireKycCompleted,
  validateRequest,
  generateToken,
};