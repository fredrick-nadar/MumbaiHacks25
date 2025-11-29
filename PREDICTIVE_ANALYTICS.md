# 🔮 AI-Powered Predictive Analytics

## Overview

This feature uses Gemini AI to analyze historical transaction data (3-4 months) and generate intelligent predictions for future spending patterns, income trends, and savings forecasts.

## How It Works

### 1. **Data Collection**
- User uploads historical transaction data (Excel/CSV files)
- System processes and categorizes transactions automatically
- Data is stored with month-wise aggregation

### 2. **Prediction Generation**
- Analyzes last 3-4 months of transaction data
- Identifies spending patterns and trends
- Detects recurring transactions (salary, EMI, SIP, subscriptions)
- Generates category-wise predictions using Gemini AI

### 3. **Visualization**
- **Predictions Tab**: Shows predicted income, expenses, and savings
- **Comparison Charts**: Predicted vs Actual spending visualization
- **Category Analysis**: Breakdown by spending categories with trends
- **Insights**: AI-generated recommendations and patterns

## Features

### 📊 **Prediction Metrics**
- **Predicted Income**: Expected inflows for next month
- **Predicted Expenses**: Forecasted spending by category
- **Expected Savings**: Projected savings and savings rate
- **Confidence Levels**: AI confidence scores for each prediction

### 📈 **Visual Analytics**
- Category-wise bar charts (Inflow vs Outflow)
- Predicted vs Actual comparison (multi-month)
- Accuracy tracking and variance analysis
- Trend indicators (increasing/decreasing/stable)

### 🧠 **AI Insights**
- Detected spending patterns
- Quarterly outlook (3-month forecast)
- Actionable recommendations
- Category volatility analysis

### 🎯 **Accuracy Tracking**
- Compare predictions against actual spending
- Track prediction accuracy over time
- Variance analysis (income and expenses)
- Overall accuracy percentage

## API Endpoints

### Generate Predictions
```http
POST /api/predictions/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "months_back": 4
}
```

### Get Latest Prediction
```http
GET /api/predictions/latest
Authorization: Bearer <token>
```

### Get Prediction for Specific Month
```http
GET /api/predictions/month/:month
Authorization: Bearer <token>

Example: /api/predictions/month/2025-12
```

### Get Prediction Accuracy
```http
GET /api/predictions/accuracy/:month
Authorization: Bearer <token>

Example: /api/predictions/accuracy/2025-11
```

### Get Comparison Overview
```http
GET /api/predictions/comparison/overview?months=3
Authorization: Bearer <token>
```

### Get Spending Insights
```http
GET /api/predictions/insights?months_back=4
Authorization: Bearer <token>
```

## Usage Flow

### Step 1: Upload Historical Data
1. Navigate to Dashboard → Filings
2. Upload 3-4 months of transaction data (Excel/CSV)
3. System automatically categorizes transactions

### Step 2: Generate Predictions
1. Go to Dashboard → Predictions tab
2. Click "Generate Predictions" button
3. AI analyzes data and creates forecasts

### Step 3: View Predictions
- **Predictions Tab**: See category-wise forecasts
- **Comparison Tab**: Compare with actual spending
- **Insights Tab**: Read AI-generated recommendations

### Step 4: Track Accuracy
- System automatically compares predictions with actuals
- View accuracy metrics for past predictions
- Use insights to improve future financial planning

## Data Models

### Prediction Schema
```javascript
{
  userId: ObjectId,
  prediction_for_month: "YYYY-MM",
  
  analysis: {
    period_analyzed: "Last 3 months",
    total_months: 3,
    patterns_detected: ["Salary on 1st", "Monthly SIP"],
    confidence_level: "high"
  },
  
  next_month_prediction: {
    categories: [{
      category: "grocery",
      predicted_inflow: 0,
      predicted_outflow: 15000,
      confidence: 0.85,
      reasoning: "Consistent monthly spending",
      trend: "stable"
    }],
    total_predicted_income: 65000,
    total_predicted_expenses: 58000,
    predicted_savings: 7000,
    predicted_savings_rate: 0.10
  },
  
  quarter_outlook: {
    monthly_averages: {
      income: 65000,
      expenses: 56000,
      savings: 9000
    },
    key_insights: ["Income stable", "Expenses trending down"],
    recommendations: ["Increase SIP by 5000"]
  },
  
  category_insights: [{
    category: "grocery",
    historical_average: 14500,
    volatility: "low",
    trend: "stable",
    is_recurring: true,
    pattern_description: "Consistent monthly spending"
  }],
  
  actual_comparison: {
    month: "2025-11",
    income: { predicted: 65000, actual: 67000, variance: 2000, accuracy: 96.9 },
    expenses: { predicted: 58000, actual: 56000, variance: -2000, accuracy: 96.5 },
    overall_accuracy: 96.7
  }
}
```

## Frontend Components

### DashboardPredictions.jsx
Main predictions page with three tabs:
- **Predictions**: Category forecasts and details
- **Comparison**: Predicted vs Actual charts
- **Insights**: AI-generated patterns and recommendations

### Features:
- Summary cards for key metrics
- Interactive charts (Bar, Line, Composed)
- Confidence badges
- Trend indicators
- Detailed category breakdown
- Accuracy tracking

## Configuration

### Backend (.env)
```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Requirements

### Minimum Data Requirements
- At least 10 transactions
- Spanning 2+ months
- Recommended: 3-4 months for better accuracy

### Categories Supported
- Income (salary, interest, refunds)
- Expenses (groceries, fuel, utilities, shopping, etc.)
- Investments (SIP, mutual funds)
- Recurring payments (EMI, insurance, rent)

## Best Practices

1. **Regular Updates**: Upload new statements monthly
2. **Data Quality**: Ensure accurate categorization
3. **Review Predictions**: Check AI-generated forecasts
4. **Track Accuracy**: Monitor variance over time
5. **Act on Insights**: Follow AI recommendations

## Troubleshooting

### "No predictions available"
- Upload at least 3-4 months of transaction data
- Click "Generate Predictions" button

### "Failed to generate predictions"
- Check Gemini API key configuration
- Verify sufficient transaction data
- Check backend logs for errors

### Low Accuracy
- Upload more historical data
- Ensure consistent spending patterns
- Review category assignments

## Future Enhancements

- [ ] Multi-month predictions (3-6 months ahead)
- [ ] Scenario planning (what-if analysis)
- [ ] Custom category rules
- [ ] Alert notifications for prediction deviations
- [ ] ML model training on user data
- [ ] Integration with budgeting goals
- [ ] Automated retraining on new data

## Technical Details

### AI Model
- **Provider**: Google Gemini
- **Model**: gemini-2.0-flash
- **Purpose**: Financial forecasting and pattern detection

### Prediction Algorithm
1. Aggregate historical data by month and category
2. Calculate trends and volatility
3. Identify recurring patterns
4. Generate predictions using Gemini AI
5. Apply confidence scoring
6. Store predictions with metadata

### Accuracy Calculation
- Compare predicted vs actual amounts
- Calculate variance and variance percentage
- Compute accuracy: `1 - (|actual - predicted| / predicted)`
- Track overall accuracy across categories

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Review Gemini API status
- Verify database connections
- Test with sample data

---

**Built with**: Node.js, Express, MongoDB, React, Gemini AI, Recharts
