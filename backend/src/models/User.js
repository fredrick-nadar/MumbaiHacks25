const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Aadhaar-based authentication
  aadhaarRefHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameLoginKey: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  yearOfBirth: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },
  gender: {
    type: String,
    required: true,
    enum: ['M', 'F', 'T']
  },
  addressMasked: {
    type: String,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  
  // KYC Information
  kycSource: {
    type: String,
    required: true,
    enum: ['QR', 'XML']
  },
  kycVerifiedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Optional contact information
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true // Allow multiple nulls but unique values
  },
  phone: {
    type: String,
    trim: true,
    sparse: true
  },
  
  // User profile for tax calculations (legacy compatibility)
  annualIncome: {
    type: Number,
    default: 0
  },
  panNumber: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.aadhaarRefHash;
      return ret;
    }
  }
});

// Compound index for name-based lookups (multiple users can have same nameLoginKey)
userSchema.index({ nameLoginKey: 1, isActive: 1 });
userSchema.index({ kycVerifiedAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.yearOfBirth;
});

// Method to get age group for tax calculations
userSchema.methods.getAgeGroup = function() {
  const age = this.age;
  if (age < 30) return 'below30';
  if (age >= 60) return 'senior';
  return '30-60';
};

module.exports = mongoose.model('User', userSchema);