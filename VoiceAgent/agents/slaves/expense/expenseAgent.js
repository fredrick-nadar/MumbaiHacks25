/**
 * Expense Agent - Handles expense tracking and analysis
 */

import { expenseMemory } from './expenseMemory.js';
import { expenseReasoner } from './expenseReasoner.js';

export class ExpenseAgent {
  constructor() {
    this.name = 'ExpenseAgent';
    this.memory = expenseMemory;
    this.reasoner = expenseReasoner;
  }

  /**
   * Main handler for expense-related tasks
   */
  async handle(task, context) {
    try {
      const userId = context.userId || 'default';
      const { query, intent } = task;
      const userContext = context.userContext || {};

      console.log(`[ExpenseAgent] Processing task for user ${userId}`);
      console.log(`[ExpenseAgent] User context available:`, {
        hasTransactions: !!userContext.recentTransactions,
        hasMonthlySummary: !!userContext.monthlySummary,
        userName: userContext.userName || 'Unknown'
      });

      // Log MongoDB data if available
      if (userContext.monthlySummary) {
        console.log(`[ExpenseAgent] ✅ Using REAL MongoDB data - Monthly Expenses: ₹${userContext.monthlySummary.expenses}`);
      }

      // Categorize the expense from query
      const expense = await this.reasoner.categorizeExpense(query);
      
      // Store the expense (in memory for now, will be saved by twilioAgent to MongoDB)
      if (expense.amount > 0) {
        this.memory.storeExpense(userId, expense);
        console.log(`[ExpenseAgent] Stored expense: ₹${expense.amount} in ${expense.category}`);
      }

      // Use REAL MongoDB data from userContext if available
      let monthlyExpenses = [];
      if (userContext.recentTransactions && userContext.recentTransactions.length > 0) {
        // Map MongoDB transactions to expense format
        monthlyExpenses = userContext.recentTransactions
          .filter(t => t.type === 'debit')
          .map(t => ({
            amount: t.amount,
            category: t.category,
            description: t.description,
            date: t.date
          }));
        console.log(`[ExpenseAgent] Using ${monthlyExpenses.length} real transactions from MongoDB`);
      } else {
        // Fallback to in-memory
        monthlyExpenses = this.memory.getMonthlyExpenses(
          userId,
          new Date().getMonth(),
          new Date().getFullYear()
        );
        console.log(`[ExpenseAgent] Using in-memory expenses (no MongoDB data)`);
      }

      // Analyze spending pattern
      const pattern = await this.reasoner.analyzeSpendingPattern(monthlyExpenses);
      
      // Check budgets
      const budgets = this.memory.getBudgets(userId);
      const warnings = await this.reasoner.predictOverspending(monthlyExpenses, budgets);

      // Generate recommendations
      const recommendations = await this.reasoner.generateRecommendations(
        pattern,
        budgets,
        warnings
      );

      // Use real monthly summary from MongoDB if available
      const actualMonthlyTotal = userContext.monthlySummary?.expenses || pattern.totalSpent;
      console.log(`[ExpenseAgent] Monthly expenses: ₹${actualMonthlyTotal} (from ${userContext.monthlySummary ? 'MongoDB' : 'memory'})`);

      // Build response
      const result = {
        success: true,
        expense,
        summary: this.buildSummary(expense, pattern, warnings, userContext),
        pattern,
        warnings,
        recommendations,
        data: {
          currentExpense: expense,
          monthlyTotal: actualMonthlyTotal,
          categoryBreakdown: pattern.categoryBreakdown,
          topCategories: pattern.topCategories,
          realDataUsed: !!userContext.recentTransactions
        },
      };

      return result;
    } catch (error) {
      console.error('[ExpenseAgent] Error:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Unable to process expense information',
      };
    }
  }

  /**
   * Build human-readable summary with real user data
   */
  buildSummary(expense, pattern, warnings, userContext = {}) {
    const parts = [];

    if (expense.amount > 0) {
      parts.push(`Logged ₹${expense.amount} for ${expense.category}.`);
    }

    // Use real MongoDB data if available
    const monthlyTotal = userContext.monthlySummary?.expenses || pattern.totalSpent;
    parts.push(`Your total monthly spending is ₹${Math.round(monthlyTotal)}.`);

    if (pattern.topCategories.length > 0) {
      const top = pattern.topCategories[0];
      parts.push(`Highest expense: ${top.category} (₹${Math.round(top.amount)}).`);
    }

    if (warnings.length > 0) {
      parts.push(`⚠️ ${warnings.length} budget warning(s).`);
    }

    return parts.join(' ');
  }

  /**
   * Get expense statistics
   */
  async getStatistics(userId, period = 'month') {
    const expenses = this.memory.getExpenses(userId);
    const total = this.memory.getTotalSpending(userId, period);
    const breakdown = this.memory.getCategoryBreakdown(userId, period);

    return {
      total,
      breakdown,
      count: expenses.length,
    };
  }

  /**
   * Set budget for a category
   */
  setBudget(userId, category, limit) {
    this.memory.setBudget(userId, category, limit);
  }
}

export default ExpenseAgent;
