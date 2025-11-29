const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

let client = null;
let textModel = null;

const PREDICTIVE_SYSTEM_PROMPT = `You are a financial forecasting expert. You analyze historical spending patterns from the past 3-4 months and generate accurate predictions for future months.

Given historical transaction data grouped by month and category, you will:
1. Identify spending patterns and trends
2. Detect seasonal variations
3. Recognize recurring transactions (salary, EMI, SIP, rent, subscriptions)
4. Account for growth/decline trends
5. Generate realistic predictions for the next 1-3 months

For each category, analyze:
- Average monthly spending
- Trend direction (increasing/decreasing/stable)
- Volatility (consistent vs variable)
- Recurring patterns

Return a JSON object with this structure:
{
  "analysis": {
    "period_analyzed": "string describing the period (e.g., 'Last 3 months')",
    "total_months": number,
    "patterns_detected": ["list of key patterns found"],
    "confidence_level": "high|medium|low"
  },
  "predictions": {
    "next_month": {
      "categories": [
        {
          "category": "category_name",
          "predicted_inflow": number (positive),
          "predicted_outflow": number (positive),
          "predicted_net": number,
          "confidence": number (0-1),
          "reasoning": "brief explanation",
          "trend": "increasing|decreasing|stable"
        }
      ],
      "total_predicted_income": number,
      "total_predicted_expenses": number,
      "predicted_savings": number,
      "predicted_savings_rate": number (0-1)
    },
    "quarter_outlook": {
      "monthly_averages": {
        "income": number,
        "expenses": number,
        "savings": number
      },
      "key_insights": ["list of insights for next 3 months"],
      "recommendations": ["list of actionable recommendations"]
    }
  },
  "category_insights": [
    {
      "category": "category_name",
      "historical_average": number,
      "volatility": "high|medium|low",
      "trend": "increasing|decreasing|stable",
      "is_recurring": boolean,
      "pattern_description": "string"
    }
  ]
}

Important:
- All amounts should be positive numbers
- Be realistic based on historical data
- Consider month-over-month trends
- Identify recurring vs variable expenses
- Provide confidence scores
- Explain your reasoning
- Return ONLY valid JSON`;

const getClient = () => {
  if (!GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return client;
};

const getTextModel = () => {
  const gemini = getClient();
  if (!gemini) return null;
  if (!textModel) {
    textModel = gemini.getGenerativeModel({ model: TEXT_MODEL_ID });
  }
  return textModel;
};

/**
 * Process historical transaction data into monthly category summaries
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Monthly aggregated data by category
 */
const aggregateHistoricalData = (transactions) => {
  const monthlyData = {};

  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        categories: {},
        totalInflow: 0,
        totalOutflow: 0
      };
    }

    const category = tx.category || 'uncategorized';
    if (!monthlyData[monthKey].categories[category]) {
      monthlyData[monthKey].categories[category] = {
        category,
        inflow: 0,
        outflow: 0,
        transactions: 0
      };
    }

    const amount = Math.abs(tx.amount || 0);
    if (tx.type === 'credit') {
      monthlyData[monthKey].categories[category].inflow += amount;
      monthlyData[monthKey].totalInflow += amount;
    } else {
      monthlyData[monthKey].categories[category].outflow += amount;
      monthlyData[monthKey].totalOutflow += amount;
    }
    monthlyData[monthKey].categories[category].transactions += 1;
  });

  // Convert to sorted array
  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Generate predictions using Gemini based on historical data
 * @param {Array} transactions - Historical transaction data (3-4 months)
 * @returns {Object} Predictions and analysis
 */
const generatePredictions = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    throw new Error('No historical data provided for prediction');
  }

  const model = getTextModel();
  if (!model) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Aggregate data by month and category
    const monthlyData = aggregateHistoricalData(transactions);
    
    if (monthlyData.length < 2) {
      throw new Error('Need at least 2 months of data for meaningful predictions');
    }

    // Prepare prompt with historical data
    const historicalSummary = {
      period: `${monthlyData[0].month} to ${monthlyData[monthlyData.length - 1].month}`,
      months: monthlyData.length,
      data: monthlyData.map(month => ({
        month: month.month,
        total_income: Math.round(month.totalInflow),
        total_expenses: Math.round(month.totalOutflow),
        net_savings: Math.round(month.totalInflow - month.totalOutflow),
        categories: Object.values(month.categories).map(cat => ({
          category: cat.category,
          inflow: Math.round(cat.inflow),
          outflow: Math.round(cat.outflow),
          transaction_count: cat.transactions
        }))
      }))
    };

    const prompt = `Analyze this historical financial data and generate predictions:

Historical Data:
${JSON.stringify(historicalSummary, null, 2)}

Generate detailed predictions for the next month and quarterly outlook based on the patterns you observe.`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: PREDICTIVE_SYSTEM_PROMPT }]
      }
    });

    const output = response?.response?.text?.();
    if (!output) {
      throw new Error('No response from Gemini API');
    }

    // Parse JSON response
    const trimmed = output.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const predictions = JSON.parse(trimmed);

    // Add metadata
    return {
      ...predictions,
      metadata: {
        generated_at: new Date().toISOString(),
        data_period: historicalSummary.period,
        months_analyzed: historicalSummary.months,
        total_transactions: transactions.length
      }
    };

  } catch (error) {
    console.error('Predictive analytics failed:', error.message);
    throw error;
  }
};

/**
 * Generate spending insights from historical data
 * @param {Array} transactions - Transaction data
 * @returns {Object} Spending insights
 */
const generateSpendingInsights = async (transactions) => {
  const model = getTextModel();
  if (!model) {
    throw new Error('Gemini API key not configured');
  }

  const monthlyData = aggregateHistoricalData(transactions);
  
  const INSIGHT_PROMPT = `Analyze this spending data and provide actionable insights:

${JSON.stringify(monthlyData, null, 2)}

Provide a concise analysis with:
1. Key spending patterns
2. Areas of concern (overspending)
3. Positive trends
4. Specific recommendations to improve savings

Return a JSON object with: { "insights": ["insight 1", "insight 2", ...], "recommendations": ["recommendation 1", ...] }`;

  try {
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: INSIGHT_PROMPT }] }]
    });

    const output = response?.response?.text?.();
    if (!output) return null;

    const trimmed = output.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(trimmed);
  } catch (error) {
    console.error('Insight generation failed:', error.message);
    return null;
  }
};

/**
 * Compare predicted vs actual spending for a given month
 * @param {Object} predictions - Generated predictions
 * @param {Array} actualTransactions - Actual transactions for the month
 * @returns {Object} Comparison analysis
 */
const compareWithActuals = (predictions, actualTransactions) => {
  const actualData = aggregateHistoricalData(actualTransactions);
  
  if (!actualData.length) {
    return {
      status: 'no_data',
      message: 'No actual data available for comparison'
    };
  }

  const actual = actualData[0]; // Most recent month
  const predicted = predictions.predictions?.next_month;

  if (!predicted) {
    return {
      status: 'error',
      message: 'No predictions available'
    };
  }

  const comparison = {
    income: {
      predicted: predicted.total_predicted_income,
      actual: actual.totalInflow,
      variance: actual.totalInflow - predicted.total_predicted_income,
      variance_percent: predicted.total_predicted_income > 0 
        ? ((actual.totalInflow - predicted.total_predicted_income) / predicted.total_predicted_income * 100)
        : 0,
      accuracy: predicted.total_predicted_income > 0
        ? (1 - Math.abs(actual.totalInflow - predicted.total_predicted_income) / predicted.total_predicted_income) * 100
        : 0
    },
    expenses: {
      predicted: predicted.total_predicted_expenses,
      actual: actual.totalOutflow,
      variance: actual.totalOutflow - predicted.total_predicted_expenses,
      variance_percent: predicted.total_predicted_expenses > 0
        ? ((actual.totalOutflow - predicted.total_predicted_expenses) / predicted.total_predicted_expenses * 100)
        : 0,
      accuracy: predicted.total_predicted_expenses > 0
        ? (1 - Math.abs(actual.totalOutflow - predicted.total_predicted_expenses) / predicted.total_predicted_expenses) * 100
        : 0
    },
    savings: {
      predicted: predicted.predicted_savings,
      actual: actual.totalInflow - actual.totalOutflow,
      variance: (actual.totalInflow - actual.totalOutflow) - predicted.predicted_savings
    }
  };

  return {
    status: 'success',
    month: actual.month,
    comparison,
    overall_accuracy: (comparison.income.accuracy + comparison.expenses.accuracy) / 2
  };
};

module.exports = {
  generatePredictions,
  generateSpendingInsights,
  compareWithActuals,
  aggregateHistoricalData
};
