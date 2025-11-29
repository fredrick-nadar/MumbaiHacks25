const express = require('express');
const { Transaction, Prediction } = require('../models');
const { generatePredictions, generateSpendingInsights, compareWithActuals } = require('../services/ai/predictiveAnalytics');
const crewaiService = require('../services/ai/crewaiService');

const router = express.Router();

// Generate predictions based on historical data
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user._id;
    const { months_back = 4 } = req.body;

    // Get all transactions for the user, sorted by date
    const allTransactions = await Transaction.find({ userId }).sort({ date: -1 });

    if (allTransactions.length < 10) {
      return res.status(400).json({
        status: 'error',
        message: `Need at least 10 transactions to generate predictions. Currently have ${allTransactions.length}.`
      });
    }

    // Get the most recent transactions (up to last N months of data)
    // Group by month and take the most recent months_back months
    const monthsMap = new Map();
    for (const txn of allTransactions) {
      const monthKey = `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, []);
      }
      monthsMap.get(monthKey).push(txn);
    }

    // Take the most recent months_back months
    const recentMonths = Array.from(monthsMap.keys()).sort().reverse().slice(0, months_back);
    const transactions = [];
    for (const month of recentMonths) {
      transactions.push(...monthsMap.get(month));
    }
    transactions.sort((a, b) => a.date - b.date);

    if (transactions.length < 10) {
      return res.status(400).json({
        status: 'error',
        message: `Need at least 10 transactions from recent months to generate predictions. Currently have ${transactions.length}.`
      });
    }

    // Check CrewAI environment
    const envStatus = await crewaiService.checkPythonEnvironment();
    console.log('🐍 CrewAI environment status:', envStatus);

    let predictions;
    try {
      // Generate predictions using CrewAI multi-agent system
      console.log('🤖 Using CrewAI for predictions...');
      predictions = await crewaiService.generatePredictions(transactions);
      console.log('✅ CrewAI predictions generated');
    } catch (crewaiError) {
      console.warn('⚠️ CrewAI failed, falling back to Gemini:', crewaiError.message);
      // Fallback to Gemini if CrewAI fails
      predictions = await generatePredictions(transactions);
    }

    // Determine the prediction month (next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const predictionMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    // Save predictions to database
    const savedPrediction = await Prediction.findOneAndUpdate(
      { userId, prediction_for_month: predictionMonth },
      {
        userId,
        prediction_for_month: predictionMonth,
        analysis: predictions.analysis,
        next_month_prediction: predictions.predictions.next_month,
        quarter_outlook: predictions.predictions.quarter_outlook,
        category_insights: predictions.category_insights,
        metadata: predictions.metadata
      },
      { upsert: true, new: true }
    );

    res.json({
      status: 'success',
      message: 'Predictions generated successfully',
      data: savedPrediction
    });

  } catch (error) {
    console.error('Prediction generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate predictions',
      error: error.message
    });
  }
});

// Get latest predictions
router.get('/latest', async (req, res) => {
  try {
    const userId = req.user._id;

    const prediction = await Prediction.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!prediction) {
      // Return 200 with empty state instead of 404
      return res.json({
        status: 'success',
        data: null,
        message: 'No predictions found. Please upload historical data and generate predictions first.'
      });
    }

    res.json({
      status: 'success',
      data: prediction
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch predictions',
      error: error.message
    });
  }
});

// Get predictions for a specific month
router.get('/month/:month', async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.params; // Format: YYYY-MM

    const prediction = await Prediction.findOne({
      userId,
      prediction_for_month: month
    });

    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: `No predictions found for ${month}`
      });
    }

    res.json({
      status: 'success',
      data: prediction
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch predictions',
      error: error.message
    });
  }
});

// Get prediction accuracy (compare with actuals)
router.get('/accuracy/:month', async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.params; // Format: YYYY-MM

    const prediction = await Prediction.findOne({
      userId,
      prediction_for_month: month
    });

    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: `No predictions found for ${month}`
      });
    }

    // Get actual transactions for that month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const actualTransactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    if (actualTransactions.length === 0) {
      return res.json({
        status: 'success',
        message: 'Prediction exists but no actual data available yet for comparison',
        data: {
          prediction,
          has_actuals: false
        }
      });
    }

    // Compare predictions with actuals
    const comparison = compareWithActuals(prediction.toObject(), actualTransactions);

    // Update prediction with comparison data
    if (comparison.status === 'success') {
      prediction.actual_comparison = {
        month: comparison.month,
        income: comparison.comparison.income,
        expenses: comparison.comparison.expenses,
        savings: comparison.comparison.savings,
        overall_accuracy: comparison.overall_accuracy,
        compared_at: new Date()
      };
      await prediction.save();
    }

    res.json({
      status: 'success',
      data: {
        prediction,
        comparison,
        has_actuals: true
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate prediction accuracy',
      error: error.message
    });
  }
});

// Get spending insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user._id;
    const { months_back = 4 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months_back);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    if (transactions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No transaction data available'
      });
    }

    const insights = await generateSpendingInsights(transactions);

    res.json({
      status: 'success',
      data: insights
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate insights',
      error: error.message
    });
  }
});

// Get all predictions history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 6 } = req.query;

    const predictions = await Prediction.find({ userId })
      .sort({ prediction_for_month: -1 })
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: {
        predictions,
        count: predictions.length
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prediction history',
      error: error.message
    });
  }
});

// Compare predicted vs actual for multiple months
router.get('/comparison/overview', async (req, res) => {
  try {
    const userId = req.user._id;
    const { months = 3 } = req.query;

    const predictions = await Prediction.find({ userId })
      .sort({ prediction_for_month: -1 })
      .limit(parseInt(months));

    const comparisons = [];

    for (const prediction of predictions) {
      const [year, monthNum] = prediction.prediction_for_month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);

      const actualTransactions = await Transaction.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      });

      if (actualTransactions.length > 0) {
        const comparison = compareWithActuals(prediction.toObject(), actualTransactions);
        comparisons.push({
          month: prediction.prediction_for_month,
          ...comparison
        });
      } else {
        comparisons.push({
          month: prediction.prediction_for_month,
          status: 'pending',
          message: 'Waiting for actual data'
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        comparisons,
        average_accuracy: comparisons
          .filter(c => c.status === 'success')
          .reduce((sum, c) => sum + (c.overall_accuracy || 0), 0) / Math.max(1, comparisons.filter(c => c.status === 'success').length)
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate comparison overview',
      error: error.message
    });
  }
});

module.exports = router;
