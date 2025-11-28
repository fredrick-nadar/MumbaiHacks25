/**
 * Tax Agent - Handles tax optimization and advice
 */

import { taxMemory } from './taxMemory.js';
import { taxReasoner } from './taxReasoner.js';

export class TaxAgent {
  constructor() {
    this.name = 'TaxAgent';
    this.memory = taxMemory;
    this.reasoner = taxReasoner;
  }

  async handle(task, context) {
    try {
      const userId = context.userId || 'default';
      const { query, intent } = task;

      console.log(`[TaxAgent] Processing task for user ${userId}`);

      // Get user's tax profile
      const profile = this.memory.getTaxProfile(userId);
      
      // Use income from previous agent if available
      const previousOutputs = context.previous || [];
      const incomeData = previousOutputs.find(o => o.agent === 'IncomeAgent');
      const expenseData = previousOutputs.find(o => o.agent === 'ExpenseAgent');

      const annualIncome = incomeData?.result?.data?.annualIncome || profile.annualIncome || 600000;
      
      // Calculate tax
      const taxCalculation = this.reasoner.calculateTax(
        annualIncome,
        profile.deductions,
        profile.taxSlab
      );

      // Get deduction suggestions
      const suggestions = await this.reasoner.suggestDeductions(
        annualIncome,
        profile.deductions
      );

      // Compare tax regimes
      const regimeComparison = this.reasoner.compareRegimes(annualIncome, profile.deductions);

      // Check if recent expense is tax-deductible
      let deductibilityCheck = null;
      if (expenseData?.result?.expense) {
        deductibilityCheck = await this.reasoner.checkTaxDeductibility(
          expenseData.result.expense
        );
      }

      const result = {
        success: true,
        summary: this.buildSummary(taxCalculation, suggestions, deductibilityCheck),
        taxCalculation,
        suggestions,
        regimeComparison,
        deductibilityCheck,
        recommendations: this.buildRecommendations(suggestions, regimeComparison),
        data: {
          annualIncome,
          taxLiability: taxCalculation.taxLiability,
          effectiveTaxRate: taxCalculation.effectiveTaxRate,
          potentialSavings: this.calculatePotentialSavings(suggestions),
        },
      };

      return result;
    } catch (error) {
      console.error('[TaxAgent] Error:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Unable to process tax information',
      };
    }
  }

  buildSummary(taxCalc, suggestions, deductCheck) {
    const parts = [];

    parts.push(`Your tax liability is ₹${taxCalc.taxLiability.toLocaleString()}.`);
    parts.push(`Effective tax rate: ${taxCalc.effectiveTaxRate}%.`);

    if (deductCheck?.isDeductible) {
      parts.push(`This expense is tax-deductible under Section ${deductCheck.section}.`);
    }

    if (suggestions.length > 0) {
      const totalSavings = suggestions.reduce((sum, s) => sum + s.remaining, 0);
      parts.push(`You can save up to ₹${Math.round(totalSavings * 0.3)} more through deductions.`);
    }

    return parts.join(' ');
  }

  buildRecommendations(suggestions, regimeComparison) {
    const recs = [];

    if (regimeComparison.recommendation === 'old') {
      recs.push(`Stick with the old tax regime to save ₹${regimeComparison.savings}.`);
    } else {
      recs.push('The new tax regime is better for you.');
    }

    suggestions.forEach(s => {
      if (s.remaining > 0) {
        recs.push(`Invest ₹${s.remaining} in ${s.options.join(' or ')} for Section ${s.section} benefits.`);
      }
    });

    return recs;
  }

  calculatePotentialSavings(suggestions) {
    const totalDeductions = suggestions.reduce((sum, s) => sum + s.remaining, 0);
    return Math.round(totalDeductions * 0.3); // Assuming 30% tax bracket
  }
}

export default TaxAgent;
