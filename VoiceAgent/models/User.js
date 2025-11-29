/**
 * User Model - Shared with backend for consistency
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
  addressMasked: String,
  passwordHash: String,
  kycSource: {
    type: String,
    enum: ['QR', 'XML']
  },
  kycVerifiedAt: Date,
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
    index: true // Important for voice agent lookup
  },
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
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date
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

userSchema.index({ nameLoginKey: 1, isActive: 1 });
userSchema.index({ phone: 1 }); // For voice agent phone number lookup

userSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.yearOfBirth;
});

userSchema.methods.getAgeGroup = function() {
  const age = this.age;
  if (age < 30) return 'below30';
  if (age >= 60) return 'senior';
  return '30-60';
};

export default mongoose.model('User', userSchema);
