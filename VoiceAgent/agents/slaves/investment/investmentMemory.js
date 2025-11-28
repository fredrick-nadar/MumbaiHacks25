/**
 * Investment Memory
 */
import { memoryStore } from '../../../core/memoryStore.js';

export class InvestmentMemory {
  constructor() {
    this.prefix = 'invest:';
  }

  storeProfile(userId, profile) {
    memoryStore.set(`${this.prefix}${userId}:profile`, profile);
  }

  getProfile(userId) {
    return memoryStore.get(`${this.prefix}${userId}:profile`) || {
      riskProfile: 'moderate',
      investments: [],
      sips: [],
    };
  }

  addInvestment(userId, investment) {
    const profile = this.getProfile(userId);
    profile.investments.push({ ...investment, timestamp: Date.now() });
    this.storeProfile(userId, profile);
  }
}

export const investmentMemory = new InvestmentMemory();
