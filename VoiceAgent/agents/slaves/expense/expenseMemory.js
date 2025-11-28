/**
 * Expense Memory - Stores expense data
 */

import { memoryStore } from '../../../core/memoryStore.js';

export class ExpenseMemory {
  constructor() {
    this.prefix = 'expense:';
  }

  /**
   * Store expense
   */
  storeExpense(userId, expense) {
    const key = `${this.prefix}${userId}:expenses`;
    const expenses = this.getExpenses(userId);
    
    expenses.push({
      ...expense,
      id: Date.now().toString(),
      timestamp: Date.now(),
    });

    memoryStore.set(key, expenses);
  }

  /**
   * Get all expenses
   */
  getExpenses(userId) {
    const key = `${this.prefix}${userId}:expenses`;
    return memoryStore.get(key) || [];
  }

  /**
   * Get expenses by category
   */
  getExpensesByCategory(userId, category) {
    const expenses = this.getExpenses(userId);
    return expenses.filter(e => e.category === category);
  }

  /**
   * Get monthly expenses
   */
  getMonthlyExpenses(userId, month, year) {
    const expenses = this.getExpenses(userId);
    return expenses.filter(e => {
      const date = new Date(e.timestamp);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  /**
   * Calculate total spending
   */
  getTotalSpending(userId, period = 'all') {
    const expenses = this.getExpenses(userId);
    let relevantExpenses = expenses;

    if (period === 'month') {
      const now = new Date();
      relevantExpenses = this.getMonthlyExpenses(userId, now.getMonth(), now.getFullYear());
    } else if (period === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      relevantExpenses = expenses.filter(e => e.timestamp > weekAgo);
    }

    return relevantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  /**
   * Get spending by category
   */
  getCategoryBreakdown(userId, period = 'month') {
    const expenses = this.getExpenses(userId);
    let relevantExpenses = expenses;

    if (period === 'month') {
      const now = new Date();
      relevantExpenses = this.getMonthlyExpenses(userId, now.getMonth(), now.getFullYear());
    }

    const breakdown = {};
    relevantExpenses.forEach(e => {
      const category = e.category || 'Other';
      breakdown[category] = (breakdown[category] || 0) + (e.amount || 0);
    });

    return breakdown;
  }

  /**
   * Store budget limit
   */
  setBudget(userId, category, limit) {
    const key = `${this.prefix}${userId}:budget`;
    const budgets = memoryStore.get(key) || {};
    budgets[category] = limit;
    memoryStore.set(key, budgets);
  }

  /**
   * Get budget limits
   */
  getBudgets(userId) {
    const key = `${this.prefix}${userId}:budget`;
    return memoryStore.get(key) || {};
  }

  /**
   * Store spending pattern
   */
  storePattern(userId, pattern) {
    const key = `${this.prefix}${userId}:patterns`;
    memoryStore.set(key, pattern);
  }

  /**
   * Get spending pattern
   */
  getPattern(userId) {
    const key = `${this.prefix}${userId}:patterns`;
    return memoryStore.get(key) || {};
  }
}

export const expenseMemory = new ExpenseMemory();
