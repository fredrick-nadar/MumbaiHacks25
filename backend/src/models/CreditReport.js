const mongoose = require('mongoose');

const creditReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Credit utilization data
  totalCreditLimit: {
    type: Number,
    default: 0
  },
  totalUtilized: {
    type: Number,
    default: 0
  },
  utilizationRatio: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  // Payment behavior
  onTimePayments: {
    type: Number,
    default: 0
  },
  totalPayments: {
    type: Number,
    default: 0
  },
  paymentScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  // Credit mix
  creditCards: {
    type: Number,
    default: 0
  },
  loans: {
    type: Number,
    default: 0
  },
  // Estimated score
  estimatedScore: {
    type: Number,
    default: 0,
    min: 300,
    max: 900
  },
  scoreRange: {
    type: String,
    enum: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
    default: 'Fair'
  },
  // Recommendations
  recommendations: [{
    category: String,
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  // Analysis metadata
  analysisDate: {
    type: Date,
    default: Date.now
  },
  dataPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
creditReportSchema.index({ userId: 1, analysisDate: -1 });

module.exports = mongoose.model('CreditReport', creditReportSchema);