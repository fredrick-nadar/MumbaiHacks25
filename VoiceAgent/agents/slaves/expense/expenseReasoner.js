/**
 * Expense Reasoner - LLM logic for expense analysis
 */

import Groq from 'groq-sdk';
import { config } from '../../../config/env.js';
import { SYSTEM_PROMPTS, AGENT_PROMPTS } from '../../../core/prompts.js';

export class ExpenseReasoner {
  constructor() {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
  }

  /**
   * Categorize expense from natural language
   */
  async categorizeExpense(expenseText) {
    try {
      const prompt = AGENT_PROMPTS.EXPENSE_CATEGORIZATION.replace('{expense}', expenseText);

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.EXPENSE_AGENT },
          { role: 'user', content: prompt },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        category: result.category || 'Other',
        amount: result.amount || 0,
        description: result.description || expenseText,
        taxDeductible: result.taxDeductible || false,
      };
    } catch (error) {
      console.error('Expense categorization error:', error);
      return {
        category: 'Other',
        amount: 0,
        description: expenseText,
        taxDeductible: false,
      };
    }
  }

  /**
   * Analyze spending patterns
   */
  async analyzeSpendingPattern(expenses) {
    try {
      const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const categoryBreakdown = {};
      
      expenses.forEach(e => {
        const cat = e.category || 'Other';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (e.amount || 0);
      });

      const topCategories = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return {
        totalSpent,
        categoryBreakdown,
        topCategories: topCategories.map(([cat, amt]) => ({ category: cat, amount: amt })),
        averageExpense: totalSpent / (expenses.length || 1),
      };
    } catch (error) {
      console.error('Pattern analysis error:', error);
      return null;
    }
  }

  /**
   * Predict overspending
   */
  async predictOverspending(expenses, budgets) {
    try {
      const warnings = [];
      const categorySpending = {};

      expenses.forEach(e => {
        const cat = e.category || 'Other';
        categorySpending[cat] = (categorySpending[cat] || 0) + (e.amount || 0);
      });

      for (const [category, budget] of Object.entries(budgets)) {
        const spent = categorySpending[category] || 0;
        const percentUsed = (spent / budget) * 100;

        if (percentUsed >= 80) {
          warnings.push({
            category,
            spent,
            budget,
            percentUsed: Math.round(percentUsed),
            severity: percentUsed >= 95 ? 'critical' : 'warning',
          });
        }
      }

      return warnings;
    } catch (error) {
      console.error('Overspending prediction error:', error);
      return [];
    }
  }

  /**
   * Generate spending recommendations
   */
  async generateRecommendations(pattern, budgets, warnings) {
    try {
      const analysisData = {
        totalSpent: pattern.totalSpent,
        topCategories: pattern.topCategories,
        warnings: warnings.length,
      };

      const prompt = `Based on this spending analysis, provide 2-3 practical recommendations:
${JSON.stringify(analysisData, null, 2)}

Focus on:
1. Reducing spending in high-expense categories
2. Budget adherence
3. Tax-saving opportunities

Respond in JSON format:
{
  "recommendations": ["recommendation 1", "recommendation 2"],
  "priority": "high/medium/low"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.EXPENSE_AGENT },
          { role: 'user', content: prompt },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return result.recommendations || [];
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return ['Track your expenses regularly', 'Set monthly budgets'];
    }
  }
}

export const expenseReasoner = new ExpenseReasoner();
