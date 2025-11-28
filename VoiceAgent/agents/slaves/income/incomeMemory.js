/**
 * Income Memory
 */
import { memoryStore } from '../../../core/memoryStore.js';

export class IncomeMemory {
  constructor() {
    this.prefix = 'income:';
  }

  storeIncome(userId, income) {
    memoryStore.set(`${this.prefix}${userId}:profile`, income);
  }

  getIncome(userId) {
    return memoryStore.get(`${this.prefix}${userId}:profile`) || {
      salary: 0,
      freelance: 0,
      other: [],
      monthly: 0,
      annual: 0,
    };
  }

  addIncomeSource(userId, source, amount) {
    const income = this.getIncome(userId);
    income[source] = amount;
    income.monthly = income.salary + income.freelance;
    income.annual = income.monthly * 12;
    this.storeIncome(userId, income);
  }
}

export const incomeMemory = new IncomeMemory();
