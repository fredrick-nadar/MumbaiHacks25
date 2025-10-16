const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const config = require('../../config/env');

/**
 * Allowed file types for Aadhaar uploads
 */
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

const MAX_FILE_SIZE = config.maxFileSize; // 5MB
const UPLOAD_DIR = config.uploadDir; // ./uploads

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @param {string} sessionId - KYC session ID
 * @returns {string} Unique filename
 */
function generateUniqueFilename(originalName, sessionId) {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${sessionId}_${timestamp}_${random}${ext}`;
}

/**
 * Validate file type
 * @param {string} filename - Filename to validate
 * @param {Array} allowedTypes - Allowed file extensions
 * @returns {boolean} Validation result
 */
function isValidFileType(filename, allowedTypes) {
  const ext = path.extname(filename).toLowerCase();
  return allowedTypes.includes(ext);
}

/**
 * Check if file is an image
 * @param {string} filename - Filename to check
 * @returns {boolean} True if image
 */
function isImageFile(filename) {
  return isValidFileType(filename, ALLOWED_IMAGE_TYPES);
}



/**
 * Custom file filter for multer
 * @param {Object} req - Express request
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  const isImage = isImageFile(file.originalname);
  
  if (!isImage) {
    const error = new Error('Invalid file type. Only image files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // Additional validation based on field name
  if (file.fieldname === 'qrImage' && !isImage) {
    const error = new Error('QR code must be an image file.');
    error.code = 'INVALID_QR_FILE_TYPE';
    return cb(error, false);
  }
  
  cb(null, true);
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const sessionId = req.body.sessionId || 'unknown';
      const uniqueName = generateUniqueFilename(file.originalname, sessionId);
      cb(null, uniqueName);
    } catch (error) {
      cb(error);
    }
  }
});

/**
 * Multer configuration for QR code uploads
 */
const uploadQR = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
}).single('qrImage');





/**
 * Middleware to handle multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart data';
        break;
      default:
        message = error.message;
    }
    
    return res.status(statusCode).json({
      status: 'error',
      message,
      code: error.code
    });
  }
  
  if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_QR_FILE_TYPE' || error.code === 'INVALID_XML_FILE_TYPE') {
    return res.status(400).json({
      status: 'error',
      message: error.message,
      code: error.code
    });
  }
  
  next(error);
}

/**
 * Clean up uploaded file
 * @param {string} filePath - Path to file to delete
 */
async function cleanupFile(filePath) {
  try {
    if (filePath) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error('Failed to cleanup file:', filePath, error);
  }
}

/**
 * Clean up multiple uploaded files
 * @param {Array} filePaths - Array of file paths to delete
 */
async function cleanupFiles(filePaths) {
  if (!Array.isArray(filePaths)) {
    return;
  }
  
  const cleanupPromises = filePaths.map(filePath => cleanupFile(filePath));
  await Promise.allSettled(cleanupPromises);
}

/**
 * Get file information
 * @param {string} filePath - Path to file
 * @returns {Object} File information
 */
async function getFileInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      extension: path.extname(filePath).toLowerCase()
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Validate uploaded file content
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
async function validateUploadedFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }
  
  try {
    const fileInfo = await getFileInfo(file.path);
    
    if (!fileInfo.exists) {
      return {
        isValid: false,
        error: 'Uploaded file not found'
      };
    }
    
    if (fileInfo.size === 0) {
      return {
        isValid: false,
        error: 'Uploaded file is empty'
      };
    }
    
    if (fileInfo.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }
    
    return {
      isValid: true,
      fileInfo,
      file
    };
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${error.message}`
    };
  }
}

/**
 * Create upload middleware with custom options
 * @param {Object} options - Upload options
 * @returns {Function} Upload middleware
 */
function createUploadMiddleware(options = {}) {
  const {
    fieldName = 'file',
    maxSize = MAX_FILE_SIZE,
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_XML_TYPES],
    maxFiles = 1
  } = options;
  
  const customFileFilter = (req, file, cb) => {
    if (!isValidFileType(file.originalname, allowedTypes)) {
      const error = new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  };
  
  return multer({
    storage,
    fileFilter: customFileFilter,
    limits: {
      fileSize: maxSize,
      files: maxFiles
    }
  }).single(fieldName);
}

module.exports = {
  uploadQR,
  handleUploadError,
  cleanupFile,
  cleanupFiles,
  getFileInfo,
  validateUploadedFile,
  createUploadMiddleware,
  isImageFile,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR
};