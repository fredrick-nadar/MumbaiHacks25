/**
 * Tax Memory - Stores tax-related data
 */

import { memoryStore } from '../../../core/memoryStore.js';

export class TaxMemory {
  constructor() {
    this.prefix = 'tax:';
  }

  storeTaxProfile(userId, profile) {
    const key = `${this.prefix}${userId}:profile`;
    memoryStore.set(key, { ...profile, timestamp: Date.now() });
  }

  getTaxProfile(userId) {
    const key = `${this.prefix}${userId}:profile`;
    return memoryStore.get(key) || {
      annualIncome: 0,
      deductions: {},
      taxSlab: 'new',
      filingHistory: [],
    };
  }

  storeDeduction(userId, deductionType, amount) {
    const profile = this.getTaxProfile(userId);
    profile.deductions[deductionType] = amount;
    this.storeTaxProfile(userId, profile);
  }

  getDeductions(userId) {
    const profile = this.getTaxProfile(userId);
    return profile.deductions || {};
  }

  storeFiling(userId, filingData) {
    const profile = this.getTaxProfile(userId);
    profile.filingHistory = profile.filingHistory || [];
    profile.filingHistory.push({ ...filingData, timestamp: Date.now() });
    this.storeTaxProfile(userId, profile);
  }
}

export const taxMemory = new TaxMemory();
