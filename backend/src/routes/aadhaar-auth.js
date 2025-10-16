const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { generateTokenPair, verifyPassword, hashPassword, logAuthEvent } = require('../services/security/auth');
const { validatePassword, generatePassword } = require('../services/security/passwordGen');
const { parseQRCode } = require('../services/aadhaar/qrParser');

const { normalizeAadhaarData } = require('../services/aadhaar/normalize');
const { hashAadhaarReference } = require('../services/aadhaar/hasher');
const { loginLimiter, passwordResetLimiter } = require('../services/security/rateLimit');
const { authenticate, validateRequest } = require('../middleware/auth');
const { uploadQR, handleUploadError, cleanupFile, validateUploadedFile } = require('../services/security/fileUpload');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const PasswordEvent = require('../models/PasswordEvent');
const moment = require('moment');

/**
 * Aadhaar-Based Login
 * POST /aadhaar-auth/login
 */
router.post('/login', loginLimiter, validateRequest(['nameLoginKey', 'password']), async (req, res) => {
  try {
    const { nameLoginKey, password } = req.body;
    
    // Find user by nameLoginKey
    const user = await User.findOne({ 
      nameLoginKey: nameLoginKey.toUpperCase(),
      isActive: true 
    });

    
    if (!user) {
      await logAuthEvent('unknown', 'login_failed', {
        nameLoginKey,
        reason: 'user_not_found',
        success: false
      }, req);
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);    if (!isPasswordValid) {
      await logAuthEvent(user._id, 'login_failed', {
        nameLoginKey,
        reason: 'invalid_password',
        success: false
      }, req);
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials'
      });
    }
    
    // Check KYC status - user must have completed KYC (have kycVerifiedAt date)
    if (!user.kycVerifiedAt) {
      await logAuthEvent(user._id, 'login_failed', {
        nameLoginKey,
        reason: 'kyc_not_completed',
        kycVerified: !!user.kycVerifiedAt,
        success: false
      }, req);
      
      return res.status(403).json({
        status: 'error',
        message: 'KYC verification required',
        data: {
          kycVerified: !!user.kycVerifiedAt,
          redirectTo: '/kyc/aadhaar'
        }
      });
    }
    
    // Generate JWT tokens
    const tokens = generateTokenPair(user);
    
    // Update user's last login
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      loginCount: (user.loginCount || 0) + 1
    });
    
    // Log successful login
    await logAuthEvent(user._id, 'login_success', {
      nameLoginKey,
      success: true,
      loginCount: (user.loginCount || 0) + 1
    }, req);
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          nameLoginKey: user.nameLoginKey,
          email: user.email,
          kycVerified: !!user.kycVerifiedAt,
          kycVerifiedAt: user.kycVerifiedAt,
          kycSource: user.kycSource,
          yearOfBirth: user.yearOfBirth,
          gender: user.gender,
          role: user.role || 'user'
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    await logAuthEvent('unknown', 'login_error', {
      error: error.message,
      success: false
    }, req);
    
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get Current User (Aadhaar-based)
 * GET /aadhaar-auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          nameLoginKey: user.nameLoginKey,
          email: user.email,
          kycVerified: !!user.kycVerifiedAt,
          kycVerifiedAt: user.kycVerifiedAt,
          kycSource: user.kycSource,
          yearOfBirth: user.yearOfBirth,
          gender: user.gender,
          addressMasked: user.addressMasked,
          role: user.role || 'user',
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user information'
    });
  }
});

/**
 * Refresh Token
 * POST /aadhaar-auth/refresh
 */
router.post('/refresh', validateRequest(['refreshToken']), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type'
      });
    }
    
    // Find user
    const user = await User.findOne({
      _id: decoded.userId,
      nameLoginKey: decoded.nameLoginKey,
      isActive: true
    });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new tokens
    const tokens = generateTokenPair(user);
    
    // Log token refresh
    await logAuthEvent(user._id, 'token_refreshed', {
      success: true
    }, req);
    
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed'
    });
  }
});

/**
 * Password Reset via Aadhaar QR
 * POST /aadhaar-auth/password-reset/qr
 */
router.post('/password-reset/qr', passwordResetLimiter, uploadQR, handleUploadError, async (req, res) => {
  let uploadedFile = null;
  
  try {
    // Validate uploaded file
    const fileValidation = await validateUploadedFile(req.file);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: fileValidation.error
      });
    }
    
    uploadedFile = req.file.path;
    
    // Parse QR code from image
    const qrData = await parseQRCode(uploadedFile);
    
    if (!qrData || !qrData.name || !qrData.dob) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Aadhaar QR code. Could not extract required information.'
      });
    }
    
    // Normalize Aadhaar data
    const normalizedData = normalizeAadhaarData(qrData);
    
    // Hash Aadhaar reference
    const referenceHash = hashAadhaarReference(qrData.referenceId || qrData.uid);
    
    // Find user with this Aadhaar hash
    const user = await User.findOne({ aadhaarRefHash: referenceHash });
    
    if (!user) {
      // Log failed attempt but don't reveal user doesn't exist
      await logAuthEvent('unknown', 'password_reset_failed', {
        reason: 'user_not_found',
        aadhaarRefHashPartial: referenceHash.substring(0, 8) + '***',
        success: false
      }, req);
      
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this Aadhaar verification. Please register first.'
      });
    }
    
    // Generate new password based on current Aadhaar data
    const passwordResult = generatePassword(normalizedData.name, normalizedData.dob);
    
    if (!passwordResult.success) {
      return res.status(400).json({
        status: 'error',
        message: passwordResult.error,
        details: passwordResult.details
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(passwordResult.password);
    
    // Update user's password
    await User.findByIdAndUpdate(user._id, {
      passwordHash: newPasswordHash,
      lastPasswordReset: new Date()
    });
    
    // Log password reset event
    const passwordEvent = new PasswordEvent({
      userId: user._id,
      action: 'reset_via_aadhaar_qr',
      oldPasswordHash: user.passwordHash,
      newPasswordHash,
      resetMethod: 'aadhaar_qr_verification',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });
    await passwordEvent.save();
    
    // Log the successful reset
    await logAuthEvent(user._id, 'password_reset_success', {
      method: 'aadhaar_qr',
      success: true
    }, req);
    
    res.json({
      status: 'success',
      message: 'Password reset successfully',
      data: {
        nameLoginKey: user.nameLoginKey,
        newPasswordHint: passwordResult.hint,
        loginInstructions: {
          step1: `Use your name: "${user.nameLoginKey}"`,
          step2: `Use your new password: "${passwordResult.hint}"`,
          step3: "Login at /aadhaar-auth/login endpoint"
        }
      }
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    // Log the failed operation
    await logAuthEvent('unknown', 'password_reset_failed', {
      method: 'aadhaar_qr',
      error: error.message,
      success: false
    }, req);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Always cleanup uploaded file
    if (uploadedFile) {
      await cleanupFile(uploadedFile);
    }
  }
});



/**
 * Logout
 * POST /aadhaar-auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Log logout event
    await logAuthEvent(req.user._id, 'logout', {
      success: true
    }, req);
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
});

/**
 * Get Login History
 * GET /aadhaar-auth/login-history
 */
router.get('/login-history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const loginEvents = await LoginEvent.find({
      userId: req.user._id,
      action: { $in: ['login_success', 'login_failed'] }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-userId');
    
    const total = await LoginEvent.countDocuments({
      userId: req.user._id,
      action: { $in: ['login_success', 'login_failed'] }
    });
    
    res.json({
      status: 'success',
      data: {
        loginHistory: loginEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Login history error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get login history'
    });
  }
});

module.exports = router;