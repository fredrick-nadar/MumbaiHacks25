/**
 * Income Reasoner
 */
export class IncomeReasoner {
  analyzeIncome(income) {
    const monthly = income.salary + income.freelance;
    const annual = monthly * 12;

    return {
      monthly,
      annual,
      breakdown: {
        salary: income.salary,
        freelance: income.freelance,
        other: income.other.reduce((sum, val) => sum + val, 0),
      },
      stability: income.freelance > income.salary ? 'variable' : 'stable',
    };
  }

  forecastIncome(income, months = 6) {
    const analysis = this.analyzeIncome(income);
    const projectedIncome = analysis.monthly * months;

    return {
      period: `${months} months`,
      projected: projectedIncome,
      breakdown: analysis.breakdown,
    };
  }
}

export const incomeReasoner = new IncomeReasoner();
