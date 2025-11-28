/**
 * Investment Agent
 */
import { investmentMemory } from './investmentMemory.js';
import { investmentReasoner } from './investmentReasoner.js';

export class InvestmentAgent {
  constructor() {
    this.name = 'InvestmentAgent';
    this.memory = investmentMemory;
    this.reasoner = investmentReasoner;
  }

  async handle(task, context) {
    try {
      const userId = context.userId || 'default';
      console.log(`[InvestmentAgent] Processing task for user ${userId}`);

      const profile = this.memory.getProfile(userId);
      const monthlyAmount = 5000; // Default, should be extracted from query

      const suggestions = await this.reasoner.suggestInvestments(
        profile.riskProfile,
        monthlyAmount,
        'tax_saving'
      );

      const sipProjection = this.reasoner.calculateSIPReturns(monthlyAmount, 10);

      return {
        success: true,
        summary: `Invest ₹${monthlyAmount}/month in ${suggestions[0].type} for ${suggestions[0].expectedReturn} returns with ${suggestions[0].taxBenefit} tax benefits.`,
        suggestions,
        sipProjection,
        recommendations: suggestions.map(s => 
          `${s.allocation} in ${s.type} (Expected: ${s.expectedReturn}, Tax: ${s.taxBenefit})`
        ),
        data: {
          riskProfile: profile.riskProfile,
          monthlyAmount,
          projectedReturns: sipProjection,
        },
      };
    } catch (error) {
      console.error('[InvestmentAgent] Error:', error);
      return { success: false, error: error.message, summary: 'Unable to process investment advice' };
    }
  }
}

export default InvestmentAgent;
