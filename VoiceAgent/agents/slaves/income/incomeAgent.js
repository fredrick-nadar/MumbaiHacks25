/**
 * Income Agent
 */
import { incomeMemory } from './incomeMemory.js';
import { incomeReasoner } from './incomeReasoner.js';

export class IncomeAgent {
  constructor() {
    this.name = 'IncomeAgent';
    this.memory = incomeMemory;
    this.reasoner = incomeReasoner;
  }

  async handle(task, context) {
    try {
      const userId = context.userId || 'default';
      console.log(`[IncomeAgent] Processing task for user ${userId}`);

      const income = this.memory.getIncome(userId);
      
      // Default values if no income stored
      if (income.monthly === 0) {
        income.salary = 50000; // Default salary
        income.monthly = 50000;
        income.annual = 600000;
      }

      const analysis = this.reasoner.analyzeIncome(income);
      const forecast = this.reasoner.forecastIncome(income, 6);

      return {
        success: true,
        summary: `Your monthly income is ₹${analysis.monthly.toLocaleString()}. Annual: ₹${analysis.annual.toLocaleString()}.`,
        analysis,
        forecast,
        recommendations: [
          analysis.stability === 'variable' ? 'Build an emergency fund of 6 months expenses' : 'Maintain regular savings',
          'Track all income sources monthly',
        ],
        data: {
          monthlyIncome: analysis.monthly,
          annualIncome: analysis.annual,
          breakdown: analysis.breakdown,
        },
      };
    } catch (error) {
      console.error('[IncomeAgent] Error:', error);
      return { success: false, error: error.message, summary: 'Unable to process income information' };
    }
  }
}

export default IncomeAgent;
