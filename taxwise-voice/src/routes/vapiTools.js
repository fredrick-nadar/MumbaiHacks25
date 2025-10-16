const express = require('express');
const User = require('../models/User');
const config = require('../config/env');

const router = express.Router();

/**
 * Middleware to authenticate VAPI tool requests
 */
const authenticateVAPITool = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header. Expected: Bearer <token>'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== config.VAPI_TOOL_TOKEN) {
    console.warn('🔒 Invalid VAPI tool token attempt:', {
      providedToken: token.substring(0, 8) + '***',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
  
  next();
};

/**
 * VAPI Tool: Query user financial data
 * POST /vapi/tool/query
 * 
 * Body: {
 *   phone?: string,
 *   userId?: string,
 *   question: string
 * }
 */
router.post('/vapi/tool/query', authenticateVAPITool, async (req, res) => {
  try {
    const { phone, userId, question } = req.body;
    
    // Validate request
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Question parameter is required and must be a string'
      });
    }
    
    if (!phone && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Either phone or userId parameter is required'
      });
    }
    
    // Find user
    const user = await User.findByPhoneOrId(phone, userId);
    if (!user) {
      console.log('🔍 User not found for VAPI query:', { phone: phone ? phone.substring(0, 8) + '***' : null, userId });
      
      return res.json({
        success: true,
        text: "I'm sorry, I couldn't find your account. Please verify your phone number or contact support for assistance.",
        data: {
          found: false,
          message: 'User not found'
        }
      });
    }
    
    console.log('🤖 VAPI tool query:', {
      userId: user._id.toString(),
      userName: user.name,
      question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });
    
    // Get user's financial summary
    const financeSummary = user.getFinanceSummary();
    
    // Question routing and response generation
    const response = generateResponse(question, user, financeSummary);
    
    res.json({
      success: true,
      text: response.text,
      data: {
        found: true,
        user: {
          name: user.name,
          phone: user.phoneFormatted
        },
        ...response.data
      }
    });
    
  } catch (error) {
    console.error('❌ Error in VAPI tool query:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      text: "I'm experiencing technical difficulties. Please try again in a moment or contact support.",
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Generate response based on user question and financial data
 */
function generateResponse(question, user, financeSummary) {
  const questionLower = question.toLowerCase();
  const { name } = user;
  const {
    financeScore,
    monthIncome,
    monthExpense,
    utilization,
    cibilEstimate,
    netSavings,
    savingsRate
  } = financeSummary;
  
  // CIBIL/Credit Score queries
  if (questionLower.includes('cibil') || questionLower.includes('credit score') || questionLower.includes('score')) {
    const scoreStatus = cibilEstimate >= 750 ? 'excellent' : 
                       cibilEstimate >= 700 ? 'good' : 
                       cibilEstimate >= 650 ? 'fair' : 'needs improvement';
    
    return {
      text: `Hello ${name}! Your estimated CIBIL score is ${cibilEstimate}, which is considered ${scoreStatus}. ${getCibilAdvice(cibilEstimate)}`,
      data: {
        cibilScore: cibilEstimate,
        scoreStatus,
        category: 'cibil'
      }
    };
  }
  
  // Credit Utilization queries
  if (questionLower.includes('utilization') || questionLower.includes('credit usage')) {
    const utilizationStatus = utilization <= 30 ? 'healthy' :
                             utilization <= 50 ? 'moderate' :
                             utilization <= 70 ? 'high' : 'very high';
    
    return {
      text: `Your current credit utilization is ${utilization}%, which is ${utilizationStatus}. ${getUtilizationAdvice(utilization)}`,
      data: {
        utilization,
        utilizationStatus,
        category: 'utilization'
      }
    };
  }
  
  // Income/Expense/Spending queries
  if (questionLower.includes('spend') || questionLower.includes('expense') || 
      questionLower.includes('income') || questionLower.includes('money') ||
      questionLower.includes('budget')) {
    
    return {
      text: `Your monthly financial summary: Income ₹${monthIncome.toLocaleString('en-IN')}, Expenses ₹${monthExpense.toLocaleString('en-IN')}, Net Savings ₹${netSavings.toLocaleString('en-IN')}. Your savings rate is ${savingsRate}%.`,
      data: {
        monthIncome,
        monthExpense,
        netSavings,
        savingsRate,
        category: 'finances'
      }
    };
  }
  
  // Finance Score queries
  if (questionLower.includes('finance score') || questionLower.includes('financial score') ||
      questionLower.includes('overall score')) {
    
    const scoreLevel = financeScore >= 80 ? 'excellent' :
                      financeScore >= 70 ? 'good' :
                      financeScore >= 60 ? 'average' : 'needs improvement';
    
    return {
      text: `Your TaxWise finance score is ${financeScore} out of 100, which is ${scoreLevel}. ${getFinanceScoreAdvice(financeScore)}`,
      data: {
        financeScore,
        scoreLevel,
        category: 'finance_score'
      }
    };
  }
  
  // Summary/Overview queries
  if (questionLower.includes('summary') || questionLower.includes('overview') ||
      questionLower.includes('everything') || questionLower.includes('all') ||
      questionLower.includes('status')) {
    
    return {
      text: `Here's your complete financial overview, ${name}: CIBIL Score ${cibilEstimate}, Finance Score ${financeScore}/100, Credit Utilization ${utilization}%, Monthly Income ₹${monthIncome.toLocaleString('en-IN')}, Expenses ₹${monthExpense.toLocaleString('en-IN')}, Savings Rate ${savingsRate}%. ${getGeneralAdvice(financeSummary)}`,
      data: {
        ...financeSummary,
        category: 'summary'
      }
    };
  }
  
  // Default response for unclear questions
  return {
    text: `I can help you with information about your CIBIL score (${cibilEstimate}), credit utilization (${utilization}%), monthly finances (Income ₹${monthIncome.toLocaleString('en-IN')}, Expenses ₹${monthExpense.toLocaleString('en-IN')}), and overall finance score (${financeScore}/100). What would you like to know more about?`,
    data: {
      ...financeSummary,
      category: 'general'
    }
  };
}

/**
 * Generate CIBIL score advice
 */
function getCibilAdvice(score) {
  if (score >= 750) {
    return "Great job! You're eligible for the best loan rates and credit offers.";
  } else if (score >= 700) {
    return "Good score! You can access most loans, though there's room for improvement to get premium rates.";
  } else if (score >= 650) {
    return "Your score is fair. Focus on paying bills on time and reducing credit utilization to improve it.";
  } else {
    return "Your score needs attention. Pay all bills on time, reduce debt, and avoid new credit applications for now.";
  }
}

/**
 * Generate utilization advice
 */
function getUtilizationAdvice(utilization) {
  if (utilization <= 30) {
    return "Excellent! Keep your utilization below 30% for optimal credit health.";
  } else if (utilization <= 50) {
    return "Consider paying down some balances to get below 30% for better credit score impact.";
  } else {
    return "High utilization can hurt your credit score. Try to pay down balances significantly.";
  }
}

/**
 * Generate finance score advice
 */
function getFinanceScoreAdvice(score) {
  if (score >= 80) {
    return "Outstanding financial management! You're on track for excellent financial health.";
  } else if (score >= 70) {
    return "Good financial habits. Keep focusing on saving and debt management.";
  } else if (score >= 60) {
    return "Decent financial standing with room for improvement in budgeting and savings.";
  } else {
    return "Focus on building emergency savings, reducing expenses, and improving your financial habits.";
  }
}

/**
 * Generate general financial advice
 */
function getGeneralAdvice(financeSummary) {
  const { savingsRate, utilization, cibilEstimate } = financeSummary;
  
  const advice = [];
  
  if (savingsRate < 20) {
    advice.push("try to increase your savings rate");
  }
  
  if (utilization > 30) {
    advice.push("reduce credit utilization");
  }
  
  if (cibilEstimate < 700) {
    advice.push("focus on improving your credit score");
  }
  
  if (advice.length > 0) {
    return `To improve your financial health, ${advice.join(', ')}.`;
  } else {
    return "Your financial profile looks healthy overall. Keep up the good work!";
  }
}

/**
 * Health check for VAPI tools
 */
router.get('/vapi/tool/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VAPI Tools',
    timestamp: new Date().toISOString(),
    endpoints: {
      query: '/vapi/tool/query (POST)',
      health: '/vapi/tool/health (GET)'
    },
    authentication: 'Bearer token required',
    version: '1.0.0'
  });
});

module.exports = router;