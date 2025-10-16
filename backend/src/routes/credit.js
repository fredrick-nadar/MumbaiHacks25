const express = require('express');
const { Transaction, CreditReport } = require('../models');

const router = express.Router();

// Calculate CIBIL score based on transaction patterns
const calculateCreditScore = (transactions, creditData) => {
  let score = 300; // Base score
  
  // Payment history (35% weightage) - +200 points max
  const paymentScore = Math.min(creditData.onTimePayments / Math.max(creditData.totalPayments, 1), 1);
  score += paymentScore * 200;
  
  // Credit utilization (30% weightage) - +180 points max
  const utilizationScore = Math.max(0, 1 - creditData.utilizationRatio);
  score += utilizationScore * 180;
  
  // Credit history length (15% weightage) - +90 points max
  const historyMonths = Math.min(transactions.length / 10, 24); // Assume 10 transactions per month
  score += (historyMonths / 24) * 90;
  
  // Credit mix (10% weightage) - +60 points max
  const creditMixScore = Math.min((creditData.creditCards + creditData.loans) / 5, 1);
  score += creditMixScore * 60;
  
  // New credit (10% weightage) - +60 points max
  // Assume stable new credit for now
  score += 40;
  
  return Math.min(Math.round(score), 900);
};

// Get credit score range
const getScoreRange = (score) => {
  if (score >= 800) return 'Excellent';
  if (score >= 750) return 'Very Good';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  return 'Poor';
};

// Generate recommendations based on credit profile
const generateRecommendations = (creditData, score) => {
  const recommendations = [];
  
  if (creditData.utilizationRatio > 0.3) {
    recommendations.push({
      category: 'Credit Utilization',
      message: `Your credit utilization is ${(creditData.utilizationRatio * 100).toFixed(1)}%. Keep it below 30% to improve your score`,
      priority: 'high'
    });
  }
  
  if (creditData.paymentScore < 0.9) {
    recommendations.push({
      category: 'Payment History',
      message: 'Make all payments on time. Payment history has the highest impact on your credit score',
      priority: 'high'
    });
  }
  
  if (creditData.creditCards === 0) {
    recommendations.push({
      category: 'Credit Mix',
      message: 'Consider getting a credit card to improve your credit mix',
      priority: 'medium'
    });
  }
  
  if (score < 700) {
    recommendations.push({
      category: 'Overall Score',
      message: 'Focus on paying bills on time and reducing credit utilization to improve your score',
      priority: 'high'
    });
  }
  
  if (creditData.utilizationRatio < 0.1) {
    recommendations.push({
      category: 'Credit Activity',
      message: 'Use your credit cards occasionally and pay them off to show active credit management',
      priority: 'low'
    });
  }
  
  return recommendations;
};

// Get credit health analysis
router.get('/health', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Analyze credit-related transactions
    const creditTransactions = await Transaction.find({
      userId,
      $or: [
        { category: { $in: ['loan_emi', 'credit_card', 'insurance'] } },
        { description: { $regex: /(credit card|loan|emi|payment)/i } }
      ]
    }).sort({ date: -1 });

    // Calculate credit utilization and payment behavior
    let totalCreditLimit = 100000; // Default assumption
    let totalUtilized = 0;
    let onTimePayments = 0;
    let totalPayments = 0;
    let creditCards = 1; // Assume at least one credit card
    let loans = 0;

    // Analyze transactions to estimate credit behavior
    const emiTransactions = creditTransactions.filter(t => t.category === 'loan_emi');
    const creditCardTransactions = creditTransactions.filter(t => t.category === 'credit_card');

    if (emiTransactions.length > 0) {
      loans = 1; // Has loan
      totalPayments += emiTransactions.length;
      // Assume 90% payments are on time for demo
      onTimePayments += Math.floor(emiTransactions.length * 0.9);
    }

    if (creditCardTransactions.length > 0) {
      totalPayments += creditCardTransactions.length;
      onTimePayments += Math.floor(creditCardTransactions.length * 0.85);
      
      // Estimate utilization based on credit card transactions
      const avgMonthlySpend = creditCardTransactions.reduce((sum, t) => sum + t.amount, 0) / 3;
      totalUtilized = avgMonthlySpend;
      totalCreditLimit = totalUtilized / 0.25; // Assume 25% utilization
    }

    const utilizationRatio = totalUtilized / totalCreditLimit;
    const paymentScore = totalPayments > 0 ? onTimePayments / totalPayments : 0.8;

    // Create or update credit report
    const creditData = {
      totalCreditLimit,
      totalUtilized,
      utilizationRatio,
      onTimePayments,
      totalPayments,
      paymentScore,
      creditCards,
      loans,
      dataPoints: creditTransactions.length
    };

    const estimatedScore = calculateCreditScore(creditTransactions, creditData);
    const scoreRange = getScoreRange(estimatedScore);
    const recommendations = generateRecommendations(creditData, estimatedScore);

    // Save to database
    const creditReport = await CreditReport.findOneAndUpdate(
      { userId },
      {
        ...creditData,
        estimatedScore,
        scoreRange,
        recommendations,
        analysisDate: new Date()
      },
      { new: true, upsert: true }
    );

    // Calculate score factors
    const factors = [
      {
        factor: 'Payment History',
        score: Math.round(paymentScore * 100),
        impact: 'High',
        status: paymentScore > 0.9 ? 'Good' : paymentScore > 0.7 ? 'Fair' : 'Poor'
      },
      {
        factor: 'Credit Utilization',
        score: Math.round((1 - utilizationRatio) * 100),
        impact: 'High',
        status: utilizationRatio < 0.3 ? 'Good' : utilizationRatio < 0.5 ? 'Fair' : 'Poor'   },
      {
        factor: 'Credit History Length',
        score: Math.min(Math.round((creditTransactions.length / 50) * 100), 100),
        impact: 'Medium',
        status: creditTransactions.length > 30 ? 'Good' : creditTransactions.length > 10 ? 'Fair' : 'Poor'
      },
      {
        factor: 'Credit Mix',
        score: Math.round(Math.min((creditCards + loans) / 3, 1) * 100),
        impact: 'Low',
        status: (creditCards + loans) >= 2 ? 'Good' : 'Fair'
      }
    ];

    res.json({
      status: 'success',
      data: {
        estimatedScore,
        scoreRange,
        lastUpdated: creditReport.analysisDate,
        factors,
        details: {
          creditUtilization: {
            used: totalUtilized,
            limit: totalCreditLimit,
            ratio: utilizationRatio,
            percentage: Math.round(utilizationRatio * 100)
          },
          paymentHistory: {
            onTime: onTimePayments,
            total: totalPayments,
            percentage: Math.round(paymentScore * 100)
          },
          accounts: {
            creditCards,
            loans,
            total: creditCards + loans
          }
        },
        recommendations,
        disclaimer: 'This is an estimated score based on transaction patterns and may not reflect your actual CIBIL score.'
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze credit health',
      error: error.message,
    });
  }
});

// Get credit tips
router.get('/tips', async (req, res) => {
  try {
    const tips = [
      {
        category: 'Payment History',
        tips: [
          'Always pay your credit card bills and loan EMIs on time',
          'Set up auto-pay for minimum amount due to avoid late payments',
          'Pay more than the minimum amount due when possible'
        ]
      },
      {
        category: 'Credit Utilization',
        tips: [
          'Keep your credit utilization below 30% of your limit',
          'Pay off credit card balances before the statement date',
          'Consider requesting a credit limit increase if you have good payment history'
        ]
      },
      {
        category: 'Credit Mix',
        tips: [
          'Maintain a healthy mix of secured and unsecured credit',
          'Consider having both credit cards and loans in your portfolio',
          'Avoid closing old credit cards unless there are high annual fees'
        ]
      },
      {
        category: 'General',
        tips: [
          'Check your credit report regularly for errors',
          'Avoid applying for multiple credit products in a short period',
          'Keep old credit accounts active with small purchases'
        ]
      }
    ];

    res.json({
      status: 'success',
      data: { tips }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch credit tips',
      error: error.message,
    });
  }
});

module.exports = router;