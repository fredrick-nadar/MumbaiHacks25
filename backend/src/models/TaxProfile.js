const mongoose = require('mongoose');

const taxProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assessmentYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    }
  },
  // Income components
  salaryIncome: {
    type: Number,
    default: 0
  },
  otherIncome: {
    type: Number,
    default: 0
  },
  capitalGains: {
    type: Number,
    default: 0
  },
  // Deductions
  section80C: {
    type: Number,
    default: 0,
    max: 150000 // Max limit for 80C
  },
  section80D: {
    type: Number,
    default: 0,
    max: 75000 // Max limit for 80D (including parents)
  },
  section80G: {
    type: Number,
    default: 0,
    max: 200000 // Reasonable cap for tracked donations
  },
  section24B: {
    type: Number,
    default: 0,
    max: 200000 // Max limit for home loan interest
  },
  otherDeductions: {
    type: Number,
    default: 0
  },
  // Tax calculations
  oldRegimeTax: {
    type: Number,
    default: 0
  },
  newRegimeTax: {
    type: Number,
    default: 0
  },
  recommendedRegime: {
    type: String,
    enum: ['old', 'new'],
    default: 'new'
  },
  taxSaved: {
    type: Number,
    default: 0
  },
  isSynthetic: {
    type: Boolean,
    default: false
  },
  syntheticSource: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique user-year combination
taxProfileSchema.index({ userId: 1, assessmentYear: 1 }, { unique: true });

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
