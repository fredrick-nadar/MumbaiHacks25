/**
 * Tax Reasoner - LLM logic for tax optimization
 */

import Groq from 'groq-sdk';
import { config } from '../../../config/env.js';
import { SYSTEM_PROMPTS } from '../../../core/prompts.js';

export class TaxReasoner {
  constructor() {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
  }

  /**
   * Calculate tax based on Indian tax slabs (FY 2024-25)
   */
  calculateTax(income, deductions = {}, regime = 'new') {
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const taxableIncome = Math.max(0, income - totalDeductions);

    let tax = 0;

    if (regime === 'new') {
      // New tax regime slabs (FY 2024-25)
      if (taxableIncome <= 300000) tax = 0;
      else if (taxableIncome <= 700000) tax = (taxableIncome - 300000) * 0.05;
      else if (taxableIncome <= 1000000) tax = 20000 + (taxableIncome - 700000) * 0.10;
      else if (taxableIncome <= 1200000) tax = 50000 + (taxableIncome - 1000000) * 0.15;
      else if (taxableIncome <= 1500000) tax = 80000 + (taxableIncome - 1200000) * 0.20;
      else tax = 140000 + (taxableIncome - 1500000) * 0.30;
    } else {
      // Old tax regime
      if (taxableIncome <= 250000) tax = 0;
      else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05;
      else if (taxableIncome <= 1000000) tax = 12500 + (taxableIncome - 500000) * 0.20;
      else tax = 112500 + (taxableIncome - 1000000) * 0.30;
    }

    // Add cess (4%)
    tax = tax * 1.04;

    return {
      taxableIncome,
      taxLiability: Math.round(tax),
      effectiveTaxRate: income > 0 ? ((tax / income) * 100).toFixed(2) : 0,
      deductionsApplied: totalDeductions,
    };
  }

  /**
   * Suggest tax-saving deductions
   */
  async suggestDeductions(income, currentDeductions) {
    try {
      const suggestions = [];

      // Section 80C (max 1.5 lakh)
      const current80C = currentDeductions['80C'] || 0;
      if (current80C < 150000) {
        suggestions.push({
          section: '80C',
          remaining: 150000 - current80C,
          options: ['PPF', 'ELSS', 'Life Insurance', 'NSC', 'Tax Saver FD'],
        });
      }

      // Section 80D (Health Insurance)
      const current80D = currentDeductions['80D'] || 0;
      const max80D = 25000; // 50000 for senior citizens
      if (current80D < max80D) {
        suggestions.push({
          section: '80D',
          remaining: max80D - current80D,
          options: ['Health Insurance Premium'],
        });
      }

      // NPS 80CCD(1B) (additional 50000)
      const currentNPS = currentDeductions['80CCD1B'] || 0;
      if (currentNPS < 50000) {
        suggestions.push({
          section: '80CCD(1B)',
          remaining: 50000 - currentNPS,
          options: ['NPS Contribution'],
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Deduction suggestion error:', error);
      return [];
    }
  }

  /**
   * Check if expense is tax-deductible
   */
  async checkTaxDeductibility(expense) {
    try {
      const deductibleCategories = {
        'Health Insurance': '80D',
        'Life Insurance': '80C',
        'Education Loan Interest': '80E',
        'Home Loan Interest': '24(b)',
        'Charitable Donations': '80G',
      };

      const category = expense.category || '';
      const section = deductibleCategories[category];

      return {
        isDeductible: !!section,
        section: section || null,
        amount: expense.amount,
        reasoning: section ? `Eligible under Section ${section}` : 'Not tax-deductible',
      };
    } catch (error) {
      console.error('Tax deductibility check error:', error);
      return { isDeductible: false, section: null };
    }
  }

  /**
   * Compare tax regimes
   */
  compareRegimes(income, deductions) {
    const oldRegime = this.calculateTax(income, deductions, 'old');
    const newRegime = this.calculateTax(income, {}, 'new'); // New regime doesn't allow deductions

    return {
      oldRegime,
      newRegime,
      recommendation: oldRegime.taxLiability < newRegime.taxLiability ? 'old' : 'new',
      savings: Math.abs(oldRegime.taxLiability - newRegime.taxLiability),
    };
  }
}

export const taxReasoner = new TaxReasoner();
