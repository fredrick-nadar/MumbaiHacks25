/**
 * Investment Reasoner
 */
import Groq from 'groq-sdk';
import { config } from '../../../config/env.js';
import { SYSTEM_PROMPTS } from '../../../core/prompts.js';

export class InvestmentReasoner {
  constructor() {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
  }

  async suggestInvestments(riskProfile, monthlyAmount, goal = 'wealth') {
    const suggestions = {
      conservative: [
        { type: 'PPF', allocation: '40%', expectedReturn: '7-8%', taxBenefit: '80C' },
        { type: 'Fixed Deposit', allocation: '30%', expectedReturn: '6-7%', taxBenefit: '80C (Tax Saver FD)' },
        { type: 'Debt Mutual Funds', allocation: '30%', expectedReturn: '7-9%', taxBenefit: 'None' },
      ],
      moderate: [
        { type: 'ELSS', allocation: '40%', expectedReturn: '12-15%', taxBenefit: '80C' },
        { type: 'Index Funds', allocation: '30%', expectedReturn: '10-12%', taxBenefit: 'None' },
        { type: 'PPF/NPS', allocation: '30%', expectedReturn: '7-10%', taxBenefit: '80C/80CCD' },
      ],
      aggressive: [
        { type: 'Equity Mutual Funds', allocation: '50%', expectedReturn: '12-18%', taxBenefit: 'None' },
        { type: 'ELSS', allocation: '30%', expectedReturn: '12-15%', taxBenefit: '80C' },
        { type: 'Stocks', allocation: '20%', expectedReturn: '15-25%', taxBenefit: 'None' },
      ],
    };

    return suggestions[riskProfile] || suggestions.moderate;
  }

  calculateSIPReturns(monthlyAmount, years, expectedReturn = 12) {
    const months = years * 12;
    const monthlyRate = expectedReturn / 12 / 100;
    
    const futureValue = monthlyAmount * 
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * 
      (1 + monthlyRate);

    return {
      invested: monthlyAmount * months,
      returns: Math.round(futureValue - monthlyAmount * months),
      totalValue: Math.round(futureValue),
    };
  }
}

export const investmentReasoner = new InvestmentReasoner();
