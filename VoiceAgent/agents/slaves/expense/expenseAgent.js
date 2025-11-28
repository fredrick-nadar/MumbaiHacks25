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

      console.log(`[ExpenseAgent] Processing task for user ${userId}`);

      // Categorize the expense from query
      const expense = await this.reasoner.categorizeExpense(query);
      
      // Store the expense
      if (expense.amount > 0) {
        this.memory.storeExpense(userId, expense);
        console.log(`[ExpenseAgent] Stored expense: ₹${expense.amount} in ${expense.category}`);
      }

      // Get all expenses
      const expenses = this.memory.getExpenses(userId);
      const monthlyExpenses = this.memory.getMonthlyExpenses(
        userId,
        new Date().getMonth(),
        new Date().getFullYear()
      );

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

      // Build response
      const result = {
        success: true,
        expense,
        summary: this.buildSummary(expense, pattern, warnings),
        pattern,
        warnings,
        recommendations,
        data: {
          currentExpense: expense,
          monthlyTotal: pattern.totalSpent,
          categoryBreakdown: pattern.categoryBreakdown,
          topCategories: pattern.topCategories,
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
   * Build human-readable summary
   */
  buildSummary(expense, pattern, warnings) {
    const parts = [];

    if (expense.amount > 0) {
      parts.push(`Logged ₹${expense.amount} for ${expense.category}.`);
    }

    parts.push(`Your total monthly spending is ₹${Math.round(pattern.totalSpent)}.`);

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
