const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        // E.164 format validation (e.g., +91XXXXXXXXXX)
        return validator.isMobilePhone(v, 'any', { strictMode: true });
      },
      message: 'Phone number must be in E.164 format (e.g., +91XXXXXXXXXX)'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isEmail(v);
      },
      message: 'Invalid email format'
    },
    sparse: true // Allow multiple null values
  },
  vitals: {
    financeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    monthIncome: {
      type: Number,
      min: 0,
      default: 0
    },
    monthExpense: {
      type: Number,
      min: 0,
      default: 0
    },
    utilization: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    cibilEstimate: {
      type: Number,
      min: 300,
      max: 900,
      default: 700
    }
  },
  lastCallAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ phone: 1 });
userSchema.index({ 'vitals.cibilEstimate': 1 });
userSchema.index({ lastCallAt: 1 });

// Virtual for formatted phone display
userSchema.virtual('phoneFormatted').get(function() {
  if (!this.phone) return '';
  // Format +91XXXXXXXXXX to +91 XXXXX XXXXX
  return this.phone.replace(/(\+\d{2})(\d{5})(\d{5})/, '$1 $2 $3');
});

// Method to check if user can be called (rate limiting)
userSchema.methods.canBeCalled = function(rateLimitMinutes = 5) {
  if (!this.lastCallAt) return true;
  
  const now = new Date();
  const timeDiff = (now - this.lastCallAt) / (1000 * 60); // minutes
  return timeDiff >= rateLimitMinutes;
};

// Method to get finance summary for voice agent
userSchema.methods.getFinanceSummary = function() {
  const { financeScore, monthIncome, monthExpense, utilization, cibilEstimate } = this.vitals;
  
  return {
    financeScore,
    monthIncome,
    monthExpense,
    utilization,
    cibilEstimate,
    netSavings: monthIncome - monthExpense,
    savingsRate: monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome * 100).toFixed(1) : 0
  };
};

// Static method to find user by phone or ID
userSchema.statics.findByPhoneOrId = async function(phone, userId) {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return await this.findById(userId);
  }
  if (phone) {
    return await this.findOne({ phone });
  }
  return null;
};

// Pre-save middleware to format phone number
userSchema.pre('save', function(next) {
  if (this.phone && !this.phone.startsWith('+')) {
    // Assume Indian number if no country code
    this.phone = '+91' + this.phone;
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;