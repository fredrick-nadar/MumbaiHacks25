const mongoose = require('mongoose');

const categoryPredictionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  predicted_inflow: {
    type: Number,
    default: 0
  },
  predicted_outflow: {
    type: Number,
    default: 0
  },
  predicted_net: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  reasoning: String,
  trend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable']
  }
}, { _id: false });

const categoryInsightSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  historical_average: Number,
  volatility: {
    type: String,
    enum: ['high', 'medium', 'low']
  },
  trend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable']
  },
  is_recurring: Boolean,
  pattern_description: String
}, { _id: false });

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Period this prediction is for
  prediction_for_month: {
    type: String, // Format: YYYY-MM
    required: true
  },
  
  // Analysis metadata
  analysis: {
    period_analyzed: String,
    total_months: Number,
    patterns_detected: [String],
    confidence_level: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  },
  
  // Predictions for next month
  next_month_prediction: {
    categories: [categoryPredictionSchema],
    total_predicted_income: Number,
    total_predicted_expenses: Number,
    predicted_savings: Number,
    predicted_savings_rate: Number
  },
  
  // Quarter outlook
  quarter_outlook: {
    monthly_averages: {
      income: Number,
      expenses: Number,
      savings: Number
    },
    key_insights: [String],
    recommendations: [String]
  },
  
  // Category-wise insights
  category_insights: [categoryInsightSchema],
  
  // Metadata
  metadata: {
    generated_at: {
      type: Date,
      default: Date.now
    },
    data_period: String,
    months_analyzed: Number,
    total_transactions: Number
  },
  
  // Actual vs Predicted comparison (filled after the month ends)
  actual_comparison: {
    month: String,
    income: {
      predicted: Number,
      actual: Number,
      variance: Number,
      variance_percent: Number,
      accuracy: Number
    },
    expenses: {
      predicted: Number,
      actual: Number,
      variance: Number,
      variance_percent: Number,
      accuracy: Number
    },
    savings: {
      predicted: Number,
      actual: Number,
      variance: Number
    },
    overall_accuracy: Number,
    compared_at: Date
  }
  
}, {
  timestamps: true
});

// Indexes
predictionSchema.index({ userId: 1, prediction_for_month: 1 }, { unique: true });
predictionSchema.index({ userId: 1, createdAt: -1 });
predictionSchema.index({ 'metadata.generated_at': -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
