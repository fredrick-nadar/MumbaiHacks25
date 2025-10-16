const express = require('express');
const { Transaction } = require('../models');

const router = express.Router();

// Get all transactions with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      type, 
      startDate, 
      endDate,
      minAmount,
      maxAmount,
      search 
    } = req.query;

    // Build filter object
    const filter = { userId: req.user._id };

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    // Get category summary
    const categoryStats = await Transaction.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          count: { $sum: 1 },
          totalAmount: { $sum: { $abs: '$amount' } },
        }
      },
      {
        $group: {
          _id: '$_id.category',
          credit: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'credit'] }, '$totalAmount', 0]
            }
          },
          debit: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'debit'] }, '$totalAmount', 0]
            }
          },
          count: { $sum: '$count' }
        }
      },
      { $sort: { debit: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalTransactions: total,
          hasNext: skip + transactions.length < total,
          hasPrev: parseInt(page) > 1,
        },
        categoryStats,
      },
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
});

// Get transaction summary
router.get('/summary', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const summary = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
          avgAmount: { $avg: { $abs: '$amount' } }
        }
      }
    ]);

    const totalIncome = summary.find(s => s._id === 'credit')?.total || 0;
    const totalExpenses = summary.find(s => s._id === 'debit')?.total || 0;
    const netFlow = totalIncome - totalExpenses;

    // Monthly trend
    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: new Date(new Date().getFullYear(), 0, 1) } // This year
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: { $abs: '$amount' } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const categoryAggregation = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            category: { $ifNull: ['$category', 'uncategorized'] },
            type: '$type'
          },
          total: { $sum: { $abs: '$amount' } },
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

    const totalDebit = categoryAggregation.reduce((sum, category) => sum + (category.debit || 0), 0);
    const totalCredit = categoryAggregation.reduce((sum, category) => sum + (category.credit || 0), 0);

    const categoryStats = categoryAggregation.map((category) => {
      const label = String(category._id || 'uncategorized');
      const debit = category.debit || 0;
      const credit = category.credit || 0;
      return {
        _id: label,
        credit,
        debit,
        total: debit,
        net: credit - debit,
        count: category.count || 0,
        shareOfOutflows: totalDebit > 0 ? debit / totalDebit : 0,
        shareOfInflows: totalCredit > 0 ? credit / totalCredit : 0,
      };
    });

    res.json({
      status: 'success',
      data: {
        period: `${period} days`,
        totalIncome,
        totalExpenses,
        netFlow,
        summary,
        monthlyTrend,
        categoryStats,
        totals: {
          totalCredit,
          totalDebit,
        },
      },
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction summary',
      error: error.message,
    });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Transaction.distinct('category', { 
      userId: req.user._id 
    });

    res.json({
      status: 'success',
      data: {
        categories: categories.sort(),
      },
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
});

module.exports = router;
