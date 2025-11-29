const express = require('express');
const { Transaction, TaxProfile } = require('../models');

const router = express.Router();

// Tax slabs for FY 2024-25
const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 }
];

const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 0.05 },
  { min: 600000, max: 900000, rate: 0.10 },
  { min: 900000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 }
];

// Calculate tax based on slabs
const calculateTax = (income, slabs) => {
  let tax = 0;
  let remainingIncome = income;

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const taxableInThisSlab = Math.min(
      remainingIncome,
      slab.max - slab.min
    );

    tax += taxableInThisSlab * slab.rate;
    remainingIncome -= taxableInThisSlab;

    if (slab.max === Infinity) break;
  }

  return Math.round(tax);
};

// Simulate tax for old vs new regime
router.get('/simulate', async (req, res) => {
  try {
    const userId = req.user._id;
    const currentYear = new Date().getFullYear();
    const assessmentYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

    // Get or create tax profile
    let taxProfile = await TaxProfile.findOne({ userId, assessmentYear });
    
    // Calculate income from transactions
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1);
    const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);

    const incomeTransactions = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'credit',
          date: { $gte: fyStart, $lte: fyEnd },
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$category', 'uncategorized'] },
          total: { $sum: { $abs: '$amount' } }
        }
      }
    ]);

    const expenseTransactions = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'debit',
          date: { $gte: fyStart, $lte: fyEnd },
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $abs: '$amount' } },
        }
      }
    ]);

    const normalizedIncome = incomeTransactions.map((entry) => ({
      category: String(entry._id || '').toLowerCase(),
      total: entry.total || 0,
    }));

    const deductionTransactions = await Transaction.find(
      {
        userId,
        type: 'debit',
        date: { $gte: fyStart, $lte: fyEnd },
      },
      { category: 1, description: 1, amount: 1 }
    ).lean();

    const deductionKeywords = {
      section80C: ['80c', 'pf', 'epf', 'ppf', 'nps', 'elss', 'ulip', 'life insurance', 'lic', 'tuition', 'sukanya', 'tax saver', 'mutual fund'],
      section80D: ['80d', 'health insurance', 'medical insurance', 'mediclaim', 'medical premium', 'med claim'],
      section80G: ['80g', 'donation', 'charity', 'relief fund', 'ngo', 'csr'],
      section24B: ['24b', 'home loan interest', 'housing loan interest', 'mortgage interest', 'property loan interest', 'home loan emi'],
    };

    const computedDeductions = {
      section80C: 0,
      section80D: 0,
      section80G: 0,
      section24B: 0,
    };

    const matchesKeywords = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

    deductionTransactions.forEach((transaction) => {
      const amount = Math.abs(Number(transaction?.amount) || 0);
      if (!amount) return;

      const haystack = `${String(transaction?.category || '').toLowerCase()} ${String(transaction?.description || '').toLowerCase()}`;

      if (matchesKeywords(haystack, deductionKeywords.section80C)) {
        computedDeductions.section80C += amount;
        return;
      }
      if (matchesKeywords(haystack, deductionKeywords.section80D)) {
        computedDeductions.section80D += amount;
        return;
      }
      if (matchesKeywords(haystack, deductionKeywords.section80G)) {
        computedDeductions.section80G += amount;
        return;
      }
      if (matchesKeywords(haystack, deductionKeywords.section24B)) {
        computedDeductions.section24B += amount;
      }
    });

    const sumByCategories = (categories) => normalizedIncome
      .filter((entry) => categories.includes(entry.category))
      .reduce((acc, entry) => acc + entry.total, 0);

    const salaryIncomeFromTx = sumByCategories([
      'salary',
      'salary_income',
      'income_salary',
      'payroll',
      'bonus',
      'arrears',
    ]);
    const capitalGainsFromTx = sumByCategories([
      'capital_gain',
      'capital_gains',
      'capital',
      'investment_income',
      'equity',
      'stock',
      'stocks',
    ]);
    const totalIncomeFromTx = normalizedIncome.reduce((acc, entry) => acc + entry.total, 0);
    const totalExpensesFromTx = expenseTransactions[0]?.total || 0;

    let syntheticSource = null;

    let salaryIncome = Number.isFinite(salaryIncomeFromTx) ? salaryIncomeFromTx : 0;
    let capitalGains = Number.isFinite(capitalGainsFromTx) ? Math.min(capitalGainsFromTx, totalIncomeFromTx) : 0;
    let otherIncome = Math.max(0, totalIncomeFromTx - salaryIncome - capitalGains);

    if (salaryIncome <= 0 && req.user?.annualIncome) {
      salaryIncome = req.user.annualIncome;
    }

    if (salaryIncome <= 0 && totalIncomeFromTx > 0) {
      salaryIncome = Math.max(0, totalIncomeFromTx - capitalGains);
      otherIncome = Math.max(0, totalIncomeFromTx - salaryIncome - capitalGains);
    }

    const capturedIncome = salaryIncome + otherIncome + capitalGains;
    if (totalIncomeFromTx > capturedIncome) {
      otherIncome += totalIncomeFromTx - capturedIncome;
    }

    salaryIncome = Math.max(0, salaryIncome);
    capitalGains = Math.max(0, capitalGains);
    otherIncome = Math.max(0, otherIncome);

    let grossIncome = salaryIncome + otherIncome + capitalGains;

    // Enhanced salary prediction based on inflows and outflows
    if (grossIncome <= 0) {
      const profileAnnualIncome = Number.isFinite(req.user?.annualIncome) ? Math.max(0, req.user.annualIncome) : 0;
      
      // Method 1: Infer from expenses (typical salary = expenses * 1.3 to 1.5 for savings)
      const inferredFromExpenses = totalExpensesFromTx > 0 ? Math.round(totalExpensesFromTx * 1.4) : 0;
      
      // Method 2: If we have any inflows but no categorized salary, use total inflows
      const inferredFromInflows = totalIncomeFromTx > 0 ? totalIncomeFromTx : 0;
      
      // Method 3: Combined approach - use the higher of expense-based or inflow-based
      const inferredFromPattern = Math.max(inferredFromExpenses, inferredFromInflows);
      
      // Baseline if nothing else available
      const baselineAnnual = 750000;
      
      // Choose the best candidate
      const candidate = Math.max(profileAnnualIncome, inferredFromPattern, baselineAnnual);

      if (candidate > 0) {
        syntheticSource = profileAnnualIncome === candidate
          ? 'profile_annual_income'
          : inferredFromPattern === candidate && inferredFromInflows > inferredFromExpenses
            ? 'inflow_pattern_analysis'
            : inferredFromPattern === candidate && inferredFromExpenses > 0
              ? 'expense_pattern_analysis'
              : 'baseline_projection';

        // Smart allocation: If we have both inflows and outflows, use them to determine salary
        if (totalIncomeFromTx > 0 && totalExpensesFromTx > 0) {
          // Use actual inflows as base, but ensure it covers expenses with reasonable savings
          const minRequiredIncome = Math.round(totalExpensesFromTx * 1.2); // At least 20% savings
          const estimatedIncome = Math.max(totalIncomeFromTx, minRequiredIncome);
          
          salaryIncome = Math.round(estimatedIncome * 0.70); // 70% from salary
          capitalGains = Math.round(estimatedIncome * 0.10); // 10% from investments
          otherIncome = Math.max(0, estimatedIncome - salaryIncome - capitalGains); // Rest as other income
        } else {
          // Fallback to simple allocation
          const targetSalary = salaryIncome > 0 ? salaryIncome : Math.round(candidate * 0.65);
          const targetCapitalGains = capitalGains > 0 ? capitalGains : Math.round(candidate * 0.10);
          const targetOther = Math.max(0, candidate - targetSalary - targetCapitalGains);

          salaryIncome = Math.max(salaryIncome, targetSalary);
          capitalGains = Math.max(capitalGains, targetCapitalGains);
          otherIncome = Math.max(otherIncome, targetOther);
        }
      }
      grossIncome = salaryIncome + otherIncome + capitalGains;
    } else if (totalExpensesFromTx > grossIncome && totalExpensesFromTx > 0) {
      // If recorded income is less than expenses, adjust income upward (user might be missing income records)
      syntheticSource = 'expense_income_mismatch_correction';
      const adjustedIncome = Math.round(totalExpensesFromTx * 1.3); // Assume 30% savings rate
      const additionalIncome = adjustedIncome - grossIncome;
      
      // Add the gap proportionally to existing income sources
      if (salaryIncome > 0) {
        salaryIncome += Math.round(additionalIncome * 0.7);
      } else {
        salaryIncome = Math.round(additionalIncome * 0.7);
      }
      otherIncome += Math.round(additionalIncome * 0.3);
      
      grossIncome = salaryIncome + otherIncome + capitalGains;
    }

    if (!taxProfile) {
      taxProfile = new TaxProfile({
        userId,
        assessmentYear,
        salaryIncome,
        otherIncome,
        capitalGains,
        // Default deductions - can be updated by user
        section80C: Math.min(Math.max(0, salaryIncome * 0.1), 150000),
        section80D: 25000,
        section80G: computedDeductions.section80G,
        section24B: 0,
        isSynthetic: Boolean(syntheticSource),
        syntheticSource,
      });
    } else {
      taxProfile.salaryIncome = salaryIncome;
      taxProfile.otherIncome = otherIncome;
      taxProfile.capitalGains = capitalGains;
      taxProfile.isSynthetic = Boolean(syntheticSource);
      taxProfile.syntheticSource = syntheticSource;
    }

    if (computedDeductions.section80C > 0) {
      taxProfile.section80C = Math.max(taxProfile.section80C || 0, computedDeductions.section80C);
    }
    if (computedDeductions.section80D > 0) {
      taxProfile.section80D = Math.max(taxProfile.section80D || 0, computedDeductions.section80D);
    }
    if (computedDeductions.section80G > 0) {
      taxProfile.section80G = Math.max(taxProfile.section80G || 0, computedDeductions.section80G);
    }
    if (computedDeductions.section24B > 0) {
      taxProfile.section24B = Math.max(taxProfile.section24B || 0, computedDeductions.section24B);
    }

    taxProfile.salaryIncome = Math.round(Math.max(0, taxProfile.salaryIncome || 0));
    taxProfile.otherIncome = Math.round(Math.max(0, taxProfile.otherIncome || 0));
    taxProfile.capitalGains = Math.round(Math.max(0, taxProfile.capitalGains || 0));
    taxProfile.section80C = Math.round(Math.min(Math.max(0, taxProfile.section80C || 0), 150000));
    taxProfile.section80D = Math.round(Math.min(Math.max(0, taxProfile.section80D || 0), 75000));
    taxProfile.section80G = Math.round(Math.min(Math.max(0, taxProfile.section80G || 0), 200000));
    taxProfile.section24B = Math.round(Math.min(Math.max(0, taxProfile.section24B || 0), 200000));
    taxProfile.otherDeductions = Math.round(Math.max(0, taxProfile.otherDeductions || 0));

    // Calculate taxable income
    grossIncome = (taxProfile.salaryIncome || 0) + (taxProfile.otherIncome || 0) + (taxProfile.capitalGains || 0);
    
    // Old regime calculations
    const section80C = taxProfile.section80C || 0;
    const section80D = taxProfile.section80D || 0;
    const section80G = taxProfile.section80G || 0;
    const section24B = taxProfile.section24B || 0;
    const otherDeductions = taxProfile.otherDeductions || 0;
    const oldRegimeDeductions = section80C + section80D + section80G + section24B + otherDeductions;
    const oldRegimeTaxableIncome = Math.max(0, grossIncome - oldRegimeDeductions);
    const oldRegimeTax = calculateTax(oldRegimeTaxableIncome, OLD_REGIME_SLABS);

    // Add cess (4% on tax)
    const oldRegimeTotalTax = Math.round(oldRegimeTax * 1.04);

    // New regime calculations (no deductions except standard deduction)
    const standardDeduction = Math.min(50000, taxProfile.salaryIncome || 0);
    const newRegimeTaxableIncome = Math.max(0, grossIncome - standardDeduction);
    const newRegimeTax = calculateTax(newRegimeTaxableIncome, NEW_REGIME_SLABS);
    
    // Add cess (4% on tax)
    const newRegimeTotalTax = Math.round(newRegimeTax * 1.04);

    // Determine recommended regime
    const recommendedRegime = newRegimeTotalTax <= oldRegimeTotalTax ? 'new' : 'old';
    const taxSaved = Math.round(Math.abs(oldRegimeTotalTax - newRegimeTotalTax));

    // Update tax profile
    taxProfile.oldRegimeTax = oldRegimeTotalTax;
    taxProfile.newRegimeTax = newRegimeTotalTax;
    taxProfile.recommendedRegime = recommendedRegime;
    taxProfile.taxSaved = taxSaved;
    
    await taxProfile.save();

    // Generate recommendations
    const recommendations = [];
    
    if (recommendedRegime === 'old') {
      const remaining80C = Math.max(0, 150000 - taxProfile.section80C);
      if (remaining80C > 0) {
        recommendations.push({
          category: '80C Investments',
          message: `Invest ₹${remaining80C.toLocaleString()} more in ELSS/PPF to maximize 80C deduction`,
          potential_saving: Math.round(remaining80C * 0.3)
        });
      }

      const remaining80D = Math.max(0, 25000 - taxProfile.section80D);
      if (remaining80D > 0) {
        recommendations.push({
          category: 'Health Insurance',
          message: 'Increase health insurance premium to save more under 80D',
          potential_saving: Math.round(remaining80D * 0.3)
        });
      }

      const remaining80G = Math.max(0, 200000 - taxProfile.section80G);
      if (remaining80G > 0) {
        recommendations.push({
          category: 'Charitable Donations',
          message: `Qualify for 80G by donating up to ₹${remaining80G.toLocaleString()} to eligible relief funds or NGOs.`,
          potential_saving: Math.round(remaining80G * 0.5),
        });
      }

      const remaining24B = Math.max(0, 200000 - taxProfile.section24B);
      if (remaining24B > 0 && taxProfile.section24B > 0) {
        recommendations.push({
          category: 'Home loan interest',
          message: 'Track interest certificates to ensure full 24(b) claim for home loan repayments.',
          potential_saving: Math.round(Math.min(remaining24B, taxProfile.section24B) * 0.3),
        });
      }
    } else {
      recommendations.push({
        category: 'New Regime Benefits',
        message: 'New regime offers lower tax rates without claiming deductions',
        potential_saving: taxSaved
      });
    }

    if (grossIncome === 0 && recommendations.length === 0) {
      recommendations.push({
        category: 'Data',
        message: 'Sync income statements to model tax regimes accurately.',
        potential_saving: 0,
      });
    }

    res.json({
      status: 'success',
      data: {
        assessmentYear,
        grossIncome,
        oldRegime: {
          taxableIncome: oldRegimeTaxableIncome,
          deductions: oldRegimeDeductions,
          tax: oldRegimeTotalTax,
          breakdown: {
            section80C,
            section80D,
            section24B,
            otherDeductions,
          }
        },
        newRegime: {
          taxableIncome: newRegimeTaxableIncome,
          standardDeduction,
          tax: newRegimeTotalTax
        },
        incomeBreakdown: {
          salary: taxProfile.salaryIncome,
          other: taxProfile.otherIncome,
          capitalGains: taxProfile.capitalGains,
        },
        deductionBreakdown: {
          oldRegime: oldRegimeDeductions,
          section80C,
          section80D,
          section80G,
          section24B,
          otherDeductions,
          standardDeduction,
        },
        recommendation: {
          regime: recommendedRegime,
          taxSaved,
          message: `Choose ${recommendedRegime} regime to save ₹${taxSaved.toLocaleString()}`
        },
        recommendations,
        meta: {
          totalIncomeFromTx,
          totalExpensesFromTx,
          ledgerCategories: normalizedIncome.length,
          incomeTransactions: incomeTransactions.length,
          synthetic: Boolean(syntheticSource),
          syntheticSource,
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Tax simulation failed',
      error: error.message,
    });
  }
});

// Update tax profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user._id;
    const currentYear = new Date().getFullYear();
    const assessmentYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    
    const {
      salaryIncome,
      otherIncome,
      capitalGains,
      section80C,
      section80D,
      section24B,
      otherDeductions
    } = req.body;

    const taxProfile = await TaxProfile.findOneAndUpdate(
      { userId, assessmentYear },
      {
        salaryIncome,
        otherIncome,
        capitalGains,
        section80C: Math.min(section80C || 0, 150000),
        section80D: Math.min(section80D || 0, 75000),
        section24B: Math.min(section24B || 0, 200000),
        otherDeductions,
      },
      { new: true, upsert: true }
    );

    res.json({
      status: 'success',
      message: 'Tax profile updated successfully',
      data: taxProfile
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update tax profile',
      error: error.message,
    });
  }
});

module.exports = router;
