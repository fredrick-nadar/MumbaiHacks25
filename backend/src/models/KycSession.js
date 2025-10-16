const mongoose = require('mongoose');

const kycSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['QR']
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'PARSED', 'COMPLETED', 'REJECTED'],
    default: 'PENDING'
  },
  
  // Temporary storage for parsed attributes (no raw Aadhaar, no full DOB)
  temp: {
    name: {
      type: String,
      trim: true
    },
    yearOfBirth: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },
    gender: {
      type: String,
      enum: ['M', 'F', 'T']
    },
    addressMasked: {
      type: String,
      trim: true
    },
    // Additional fields needed for user creation
    dob: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    nameLoginKey: {
      type: String,
      trim: true
    },
    generatedPassword: {
      type: String,
      trim: true
    },
    passwordHint: {
      type: String,
      trim: true
    }
  },
  
  // Preview of reference for UI (last 4 digits or hash preview)
  referencePreview: {
    type: String,
    trim: true
  },
  
  // Aadhaar reference hash for user lookup
  aadhaarRefHash: {
    type: String,
    trim: true
  },
  
  // Session expiry
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  },
  
  // Error information if parsing failed
  errorMessage: {
    type: String,
    trim: true
  },
  
  // Optional metadata
  fileInfo: {
    originalName: String,
    mimeType: String,
    size: Number
  },
  
  // IP and user agent for security tracking
  clientIp: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
kycSessionSchema.index({ status: 1 });
kycSessionSchema.index({ createdAt: -1 });
kycSessionSchema.index({ source: 1, status: 1 });

// Method to check if session is expired
kycSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to mark session as expired
kycSessionSchema.methods.markExpired = function() {
  this.status = 'REJECTED';
  this.errorMessage = 'Session expired';
  return this.save();
};

// Static method to generate session ID
kycSessionSchema.statics.generateSessionId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `kx_${timestamp}_${random}`;
};

// Static method to cleanup expired sessions
kycSessionSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

module.exports = mongoose.model('KycSession', kycSessionSchema);