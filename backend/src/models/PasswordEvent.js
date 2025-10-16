const mongoose = require('mongoose');

const passwordEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Password event type
  kind: {
    type: String,
    required: true,
    enum: ['SET', 'ROTATE', 'RESET']
  },
  
  // Reason for password change
  reason: {
    type: String,
    required: true,
    enum: ['REGISTER', 'AADHAAR_REVERIFY', 'DOB_CORRECTION', 'SECURITY_RESET', 'ADMIN_RESET']
  },
  
  // Request information
  ip: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // KYC session reference if applicable (for AADHAAR_REVERIFY)
  kycSessionId: {
    type: String,
    trim: true
  },
  
  // Previous password hash (for rotation tracking)
  previousPasswordHash: {
    type: String
  },
  
  // Success/failure tracking
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  
  // Error message if failed
  errorMessage: {
    type: String,
    trim: true
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed // For storing additional context
  }
}, {
  timestamps: true
});

// Indexes for queries and performance
passwordEventSchema.index({ userId: 1, createdAt: -1 });
passwordEventSchema.index({ kind: 1, createdAt: -1 });
passwordEventSchema.index({ reason: 1, createdAt: -1 });
passwordEventSchema.index({ success: 1, createdAt: -1 });

// Static method to get user password history
passwordEventSchema.statics.getUserPasswordHistory = async function(userId, limit = 5) {
  return await this.find({ userId, success: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('kind reason createdAt ip')
    .populate('userId', 'name nameLoginKey');
};

// Static method to check password reset rate limiting
passwordEventSchema.statics.getRecentResets = async function(userId, timeWindowHours = 24) {
  const since = new Date(Date.now() - (timeWindowHours * 60 * 60 * 1000));
  return await this.countDocuments({
    userId,
    kind: 'RESET',
    success: true,
    createdAt: { $gte: since }
  });
};

// Static method to get password rotation frequency
passwordEventSchema.statics.getRotationFrequency = async function(userId) {
  const events = await this.find({
    userId,
    kind: { $in: ['ROTATE', 'RESET'] },
    success: true
  }).sort({ createdAt: -1 }).limit(2);
  
  if (events.length < 2) return null;
  
  const daysDiff = Math.floor((events[0].createdAt - events[1].createdAt) / (1000 * 60 * 60 * 24));
  return daysDiff;
};

// Method to create security audit trail
passwordEventSchema.statics.createAuditEntry = async function(data) {
  const event = new this(data);
  await event.save();
  
  // Log security event for monitoring
  console.log(`🔐 Password Event: User ${data.userId} - ${data.kind} (${data.reason})`);
  
  return event;
};

module.exports = mongoose.model('PasswordEvent', passwordEventSchema);