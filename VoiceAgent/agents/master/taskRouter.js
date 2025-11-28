/**
 * Task Router - Maps intents to appropriate slave agents
 */

export const taskRouter = {
  /**
   * Map intent to required agents
   */
  mapIntentToAgents(intent) {
    const mappings = {
      expense_logging: ['ExpenseAgent'],
      tax_saving_advice: ['TaxAgent'],
      invest_for_tax_saving: ['InvestmentAgent', 'TaxAgent'],
      income_vs_expenses: ['IncomeAgent', 'ExpenseAgent'],
      investment_advice: ['InvestmentAgent'],
      income_tracking: ['IncomeAgent'],
      budget_planning: ['IncomeAgent', 'ExpenseAgent'],
      financial_overview: ['IncomeAgent', 'ExpenseAgent', 'TaxAgent', 'InvestmentAgent'],
    };

    return mappings[intent] || [];
  },

  /**
   * Get agent execution order
   * Some agents need to run before others
   */
  getExecutionOrder(agentNames) {
    const priorityOrder = {
      IncomeAgent: 1,
      ExpenseAgent: 2,
      TaxAgent: 3,
      InvestmentAgent: 4,
    };

    return agentNames.sort((a, b) => {
      const priorityA = priorityOrder[a] || 999;
      const priorityB = priorityOrder[b] || 999;
      return priorityA - priorityB;
    });
  },

  /**
   * Check if agents can run in parallel
   */
  canRunInParallel(agentNames) {
    // If only one agent, can't parallelize
    if (agentNames.length <= 1) return false;

    // These combinations can run in parallel
    const parallelCombinations = [
      ['InvestmentAgent', 'ExpenseAgent'],
      ['IncomeAgent', 'TaxAgent'],
    ];

    for (const combo of parallelCombinations) {
      if (
        combo.every(agent => agentNames.includes(agent)) &&
        agentNames.length === combo.length
      ) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get task priority
   */
  getTaskPriority(intent) {
    const highPriority = ['expense_logging', 'income_tracking'];
    const mediumPriority = ['tax_saving_advice', 'investment_advice'];
    const lowPriority = ['financial_overview', 'budget_planning'];

    if (highPriority.includes(intent)) return 'high';
    if (mediumPriority.includes(intent)) return 'medium';
    if (lowPriority.includes(intent)) return 'low';

    return 'medium';
  },
};

export default taskRouter;
