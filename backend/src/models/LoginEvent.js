const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow null for anonymous users during KYC
    index: true
  },
  
  // Action performed
  action: {
    type: String,
    required: true,
    trim: true
  },
  
  // Request information
  ip: {
    type: String,
    required: true,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // Optional geolocation (if ENABLE_IP_GEO is true)
  locationCity: {
    type: String,
    trim: true
  },
  locationRegion: {
    type: String,
    trim: true
  },
  locationCountry: {
    type: String,
    trim: true
  },
  
  // Optional device fingerprinting
  deviceJson: {
    type: String // JSON string with device info
  },
  
  // Login result
  success: {
    type: Boolean,
    required: true
  },
  
  // Failure reason if applicable
  failureReason: {
    type: String,
    enum: ['INVALID_NAME', 'INVALID_PASSWORD', 'USER_NOT_FOUND', 'ACCOUNT_DISABLED', 'RATE_LIMITED'],
    trim: true
  },
  
  // Session information
  sessionDuration: {
    type: Number // in milliseconds, set when session ends
  },
  
  // Security flags
  isNewDevice: {
    type: Boolean,
    default: false
  },
  isSuspicious: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance and security queries
loginEventSchema.index({ userId: 1, createdAt: -1 });
loginEventSchema.index({ ip: 1, createdAt: -1 });
loginEventSchema.index({ success: 1, createdAt: -1 });
loginEventSchema.index({ action: 1, createdAt: -1 });
loginEventSchema.index({ createdAt: -1 }); // For cleanup

// Static method for security analysis
loginEventSchema.statics.getRecentFailures = async function(ip, timeWindowHours = 1) {
  const since = new Date(Date.now() - (timeWindowHours * 60 * 60 * 1000));
  return await this.countDocuments({
    ip,
    success: false,
    createdAt: { $gte: since }
  });
};

// Static method to get user login history
loginEventSchema.statics.getUserLoginHistory = async function(userId, limit = 10) {
  return await this.find({ userId, success: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('ip locationCity locationCountry createdAt userAgent');
};

// Static method for cleanup old login events
loginEventSchema.statics.cleanupOldEvents = async function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
  return result.deletedCount;
};

module.exports = mongoose.model('LoginEvent', loginEventSchema);