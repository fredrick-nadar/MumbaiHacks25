const express = require('express');
const { Transaction, TaxProfile, CreditReport } = require('../models');

const router = express.Router();

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const currentYear = new Date(currentDate.getFullYear(), 0, 1);
    const trailingWindowDays = 60;
    const trailingWindowStart = new Date(currentDate);
    trailingWindowStart.setDate(trailingWindowStart.getDate() - trailingWindowDays);

    // Get monthly financial summary
    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const currentMonthIncome = monthlyStats.find(s => s._id === 'credit')?.total || 0;
    const currentMonthExpenses = monthlyStats.find(s => s._id === 'debit')?.total || 0;
    const monthlyNetFlow = currentMonthIncome - currentMonthExpenses;
    const monthlyTransactionCount = monthlyStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

    const trailingStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: trailingWindowStart }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const trailingIncome = trailingStats.find((s) => s._id === 'credit')?.total || 0;
    const trailingExpenses = trailingStats.find((s) => s._id === 'debit')?.total || 0;
    const trailingNetFlow = trailingIncome - trailingExpenses;
    const trailingTransactionCount = trailingStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

    // Get last month stats for comparison
    const lastMonthStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: lastMonth, $lt: currentMonth }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $abs: '$amount' } }
        }
      }
    ]);

    const lastMonthIncome = lastMonthStats.find(s => s._id === 'credit')?.total || 0;
    const lastMonthExpenses = lastMonthStats.find(s => s._id === 'debit')?.total || 0;

    // Calculate changes
    let incomeChange = lastMonthIncome > 0 ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : null;
    let expenseChange = lastMonthExpenses > 0 ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : null;

    let observedIncome = currentMonthIncome;
    let observedExpenses = currentMonthExpenses;
    let observedNetFlow = monthlyNetFlow;
    let observedTransactionCount = monthlyTransactionCount;
    let observationType = 'current_month';
    let observationLabel = 'This month';

    if (observedIncome === 0 && observedExpenses === 0 && (trailingIncome > 0 || trailingExpenses > 0)) {
      observedIncome = trailingIncome;
      observedExpenses = trailingExpenses;
      observedNetFlow = trailingNetFlow;
      observedTransactionCount = trailingTransactionCount;
      observationType = 'trailing_60_days';
      observationLabel = 'Last 60 days';
      incomeChange = null;
      expenseChange = null;
    }
    let observationStart = observationType === 'current_month' ? currentMonth : trailingWindowStart;

    if (observedIncome === 0 && observedExpenses === 0) {
      const longRangeStart = new Date(currentDate);
      longRangeStart.setDate(longRangeStart.getDate() - 365);
      const longRangeStats = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: longRangeStart },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $abs: '$amount' } },
            count: { $sum: 1 },
          },
        },
      ]);

      const longIncome = longRangeStats.find((s) => s._id === 'credit')?.total || 0;
      const longExpenses = longRangeStats.find((s) => s._id === 'debit')?.total || 0;
      const longNet = longIncome - longExpenses;
      const longCount = longRangeStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

      if (longIncome > 0 || longExpenses > 0) {
        observedIncome = longIncome;
        observedExpenses = longExpenses;
        observedNetFlow = longNet;
        observedTransactionCount = longCount;
        observationType = 'trailing_365_days';
        observationLabel = 'Last 12 months';
        observationStart = longRangeStart;
        incomeChange = null;
        expenseChange = null;
      }
    }

    const effectiveSavingsRate = observedIncome > 0 ? (observedNetFlow / observedIncome) : 0;

    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: observationStart }
        }
      },
      {
        $group: {
          _id: {
            category: { $ifNull: ['$category', 'uncategorized'] },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          credit: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'credit'] }, '$total', 0]
            }
          },
          debit: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'debit'] }, '$total', 0]
            }
          },
          count: { $sum: '$count' }
        }
      },
      {
        $addFields: {
          net: { $subtract: ['$credit', '$debit'] }
        }
      },
      { $sort: { debit: -1, credit: -1 } }
    ]);

    const totalDebitAcrossCategories = categoryBreakdown.reduce((sum, category) => sum + (category.debit || 0), 0);
    const totalCreditAcrossCategories = categoryBreakdown.reduce((sum, category) => sum + (category.credit || 0), 0);

    const topCategories = categoryBreakdown.slice(0, 5).map((category) => {
      const label = String(category._id || 'uncategorized');
      const debit = category.debit || 0;
      const credit = category.credit || 0;
      return {
        _id: label,
        total: debit,
        debit,
        credit,
        net: credit - debit,
        count: category.count || 0,
        shareOfOutflows: totalDebitAcrossCategories > 0 ? debit / totalDebitAcrossCategories : 0,
        shareOfInflows: totalCreditAcrossCategories > 0 ? credit / totalCreditAcrossCategories : 0
      };
    });


    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(10)
      .select('date description amount type category subcategory patternType isRecurring notes balance rawDescription');

    // Get latest tax profile
    const currentAssessmentYear = `${currentDate.getFullYear()}-${(currentDate.getFullYear() + 1).toString().slice(-2)}`;
    const taxProfile = await TaxProfile.findOne({ 
      userId, 
      assessmentYear: currentAssessmentYear 
    });

    // Get latest credit report
    const creditReport = await CreditReport.findOne({ userId })
      .sort({ analysisDate: -1 });

    let creditUtilizationRatio = null;
    if (creditReport) {
      if (typeof creditReport.utilizationRatio === 'number') {
        creditUtilizationRatio = creditReport.utilizationRatio;
      } else if (typeof creditReport.utilizationRatio === 'string') {
        const parsedUtil = parseFloat(creditReport.utilizationRatio);
        if (Number.isFinite(parsedUtil)) {
          creditUtilizationRatio = parsedUtil > 1 ? parsedUtil / 100 : parsedUtil;
        }
      }
    }

    const healthBreakdown = [];
    let healthScore = 0;

    const addHealthComponent = (label, weight, ratio, context = {}) => {
      const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
      const contribution = Math.round(weight * safeRatio);
      healthScore += contribution;
      healthBreakdown.push({ label, weight, contribution, ratio: safeRatio, context });
    };

    const incomeTarget = 80000;
    addHealthComponent('Income capacity', 18, observedIncome > 0 ? Math.min(1, observedIncome / incomeTarget) : 0, {
      observedIncome,
      incomeTarget,
    });

    const cashRetentionTarget = Math.max(observedIncome * 0.35, 25000);
    const netRetentionRatio = observedNetFlow > 0 ? Math.min(1, observedNetFlow / Math.max(1, cashRetentionTarget)) : 0;
    addHealthComponent('Net cash retention', 22, netRetentionRatio, {
      observedNetFlow,
      cashRetentionTarget,
    });

    let savingsDisciplineRatio = 0;
    if (effectiveSavingsRate >= 0.3) savingsDisciplineRatio = 1;
    else if (effectiveSavingsRate >= 0.2) savingsDisciplineRatio = 0.85;
    else if (effectiveSavingsRate >= 0.12) savingsDisciplineRatio = 0.65;
    else if (effectiveSavingsRate >= 0.05) savingsDisciplineRatio = 0.35;
    else if (effectiveSavingsRate > 0) savingsDisciplineRatio = 0.15;
    addHealthComponent('Savings discipline', 18, savingsDisciplineRatio, {
      savingsRate: effectiveSavingsRate,
    });

    let expenseControlRatio;
    if (expenseChange === null) {
      expenseControlRatio = effectiveSavingsRate > 0 ? 0.6 : 0.4;
    } else if (expenseChange <= 0) {
      expenseControlRatio = 1;
    } else if (expenseChange <= 5) {
      expenseControlRatio = 0.75;
    } else if (expenseChange <= 15) {
      expenseControlRatio = 0.45;
    } else {
      expenseControlRatio = 0.15;
    }
    addHealthComponent('Expense control', 12, expenseControlRatio, { expenseChange });

    let creditRatio = 0.35;
    let creditContext = {};
    if (creditReport) {
      const estimatedScore = creditReport.estimatedScore || 0;
      const normalizedScore = Math.max(0, Math.min(1, (estimatedScore - 580) / 270));
      const utilizationPenalty = creditUtilizationRatio === null || creditUtilizationRatio === undefined
        ? 1
        : Math.max(0, Math.min(1, 1 - Math.max(0, creditUtilizationRatio - 0.3) / 0.5));
      creditRatio = normalizedScore * utilizationPenalty;
      creditContext = {
        estimatedScore,
        utilization: creditUtilizationRatio,
      };
    } else {
      creditContext = { message: 'Using baseline score due to missing credit report' };
    }
    addHealthComponent('Credit health', 20, creditRatio, creditContext);

    let taxPostureRatio = 0.3;
    let taxContext = { message: 'No tax profile on file' };
    if (taxProfile) {
      taxPostureRatio = taxProfile.recommendedRegime ? 1 : 0.6;
      taxContext = {
        recommendedRegime: taxProfile.recommendedRegime,
        taxSaved: taxProfile.taxSaved,
      };
    }
    addHealthComponent('Tax posture', 6, taxPostureRatio, taxContext);

    const dataCoverageRatio = Math.min(1, observedTransactionCount / 30);
    addHealthComponent('Data coverage', 4, dataCoverageRatio, { observedTransactionCount });

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus = 'Needs attention';
    if (healthScore >= 85) healthStatus = 'Excellent';
    else if (healthScore >= 70) healthStatus = 'Healthy';
    else if (healthScore >= 55) healthStatus = 'Fair';

    const healthSignals = [];
    if (observedNetFlow <= 0) healthSignals.push('Net cash flow turned negative in the observed period.');
    if (effectiveSavingsRate < 0.1) healthSignals.push('Savings rate below 10%; review discretionary spending.');
    if (!creditReport) healthSignals.push('Upload a recent credit report to tighten the health score accuracy.');
    if (observedTransactionCount < 10) healthSignals.push('Ledger coverage is thin; sync more statements for higher fidelity.');
    if (creditUtilizationRatio !== null && creditUtilizationRatio > 0.4) {
      healthSignals.push('Credit utilization is above 40%; repaying revolving balances will boost the score.');
    }

    // Generate alerts
    const alerts = [];
    const periodDescriptor = observationLabel.toLowerCase();

    if (observedNetFlow < 0) {
      alerts.push({
        type: 'warning',
        message: `Net cash flow is negative by ₹${Math.abs(observedNetFlow).toLocaleString()} ${periodDescriptor}.`,
        category: 'cashflow'
      });
    }
    
    if (expenseChange !== null && expenseChange > 20) {
      alerts.push({
        type: 'warning',
        message: `Your expenses increased by ${expenseChange.toFixed(1)}% this month`,
        category: 'spending'
      });
    }
    
    if (effectiveSavingsRate < 0.1) {
      alerts.push({
        type: 'error',
        message: `Your savings rate is below 10% ${periodDescriptor}. Consider reducing expenses.`,
        category: 'savings'
      });
    }
    
    if (creditUtilizationRatio !== null && creditUtilizationRatio > 0.3) {
      alerts.push({
        type: 'warning',
        message: 'Your credit utilization is above 30%. This may impact your credit score',
        category: 'credit'
      });
    }
    
    if (taxProfile && taxProfile.section80C < 150000) {
      const potential = Math.round((150000 - taxProfile.section80C) * 0.3);
      alerts.push({
        type: 'info',
        message: `You can save ₹${potential.toLocaleString()} more in taxes by maximizing 80C deductions`,
        category: 'tax'
      });
    }

    if (observedTransactionCount < 8) {
      alerts.push({
        type: 'info',
        message: 'Only a handful of statements are synced. Upload more data for tighter analytics.',
        category: 'data'
      });
    }

    // Generate insights
    const insights = [];
    
    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      const normalisedLabel = topCategory._id.replace(/_/g, ' ');
      if (topCategory.debit > 0) {
        insights.push(`${normalisedLabel} drives ${(topCategory.shareOfOutflows * 100).toFixed(1)}% of outflows ${observationLabel.toLowerCase()}.`);
      } else if (topCategory.credit > 0) {
        insights.push(`${normalisedLabel} contributes ${(topCategory.shareOfInflows * 100).toFixed(1)}% of inflows ${observationLabel.toLowerCase()}.`);
      }
    }

    if (observedNetFlow > 0) {
      insights.push(`You retained ₹${observedNetFlow.toLocaleString()} ${observationLabel.toLowerCase()} (${(effectiveSavingsRate * 100).toFixed(1)}% savings rate).`);
    } else if (observedNetFlow < 0) {
      insights.push(`Spending outpaced inflows by ₹${Math.abs(observedNetFlow).toLocaleString()} ${observationLabel.toLowerCase()}.`);
    }

    insights.push(`Financial health is ${healthStatus.toLowerCase()} (score ${healthScore}/100).`);

    if (creditReport) {
      insights.push(`Estimated credit score ${creditReport.estimatedScore} (${creditReport.scoreRange}).`);
    }

    res.json({
      status: 'success',
      data: {
        summary: {
          currentMonthIncome: observedIncome,
          currentMonthExpenses: observedExpenses,
          monthlyNetFlow: observedNetFlow,
          savingsRate: Math.round(effectiveSavingsRate * 100),
          healthScore: Math.round(healthScore),
          healthStatus,
          period: observationType,
          periodLabel: observationLabel,
          observationStart,
          observationEnd: currentDate,
          transactionCount: observedTransactionCount,
          healthBreakdown,
          healthSignals,
        },
        changes: {
          incomeChange: incomeChange === null ? null : Math.round(incomeChange * 10) / 10,
          expenseChange: expenseChange === null ? null : Math.round(expenseChange * 10) / 10,
          basis: observationType,
        },
        topCategories,
        categoryTotals: {
          totalOutflows: totalDebitAcrossCategories,
          totalInflows: totalCreditAcrossCategories,
        },
        recentTransactions,
        taxSummary: taxProfile ? {
          assessmentYear: taxProfile.assessmentYear,
          recommendedRegime: taxProfile.recommendedRegime,
          taxSaved: taxProfile.taxSaved,
          oldRegimeTax: taxProfile.oldRegimeTax,
          newRegimeTax: taxProfile.newRegimeTax
        } : null,
        creditSummary: creditReport ? {
          estimatedScore: creditReport.estimatedScore,
          scoreRange: creditReport.scoreRange,
          utilizationRatio: creditUtilizationRatio !== null ? Math.round(creditUtilizationRatio * 100) : null,
          lastUpdated: creditReport.analysisDate
        } : null,
        alerts,
        insights
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard summary',
      error: error.message,
    });
  }
});

// Get spending trends
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '6' } = req.query; // months
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(period));

    const trends = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'credit'] }, '$total', 0]
            }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'debit'] }, '$total', 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        period: `${period} months`,
        trends
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch spending trends',
      error: error.message,
    });
  }
});

module.exports = router;
