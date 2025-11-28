/**
 * Core Schema Definitions
 * Defines data structures used across all agents
 */

export const TaskSchema = {
  id: '',
  type: '',
  priority: 0,
  payload: {},
  context: {},
  timestamp: Date.now(),
};

export const AgentResponseSchema = {
  agentName: '',
  success: false,
  data: {},
  error: null,
  timestamp: Date.now(),
};

export const IntentSchema = {
  intent: '',
  confidence: 0,
  language: 'en',
  entities: [],
};

export const MemoryEntrySchema = {
  userId: '',
  agentName: '',
  data: {},
  timestamp: Date.now(),
  expiresAt: null,
};

export const FinancialProfileSchema = {
  userId: '',
  income: {
    salary: 0,
    freelance: 0,
    other: [],
  },
  expenses: {
    monthly: [],
    categories: {},
  },
  investments: {
    sips: [],
    stocks: [],
    mutualFunds: [],
  },
  tax: {
    filingHistory: [],
    deductions: {},
    taxSlab: '',
  },
};

export const ConversationContextSchema = {
  conversationId: '',
  userId: '',
  language: 'en',
  history: [],
  currentIntent: null,
  metadata: {},
};
