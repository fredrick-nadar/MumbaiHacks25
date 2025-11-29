/**
 * Tax Calculator Agent - Interactive step-by-step tax calculation via voice
 * Collects inputs conversationally and calculates tax under Old vs New regime
 */

export class TaxCalculatorAgent {
  constructor() {
    this.name = 'TaxCalculatorAgent';
    // Store ongoing tax calculation sessions
    this.sessions = new Map();
  }

  /**
   * Initialize a new tax calculation session
   */
  initSession(userId) {
    const session = {
      step: 0,
      awaitingInput: false,  // Track if we're waiting for user's response
      data: {
        salaryIncome: null,
        otherIncome: null,
        section80C: null,       // Max 1.5L
        otherDeductions: null,  // HRA, education loan, etc.
      },
      completed: false,
      startedAt: Date.now()
    };
    this.sessions.set(userId, session);
    return session;
  }

  /**
   * Get current session or create new one
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      return this.initSession(userId);
    }
    return this.sessions.get(userId);
  }

  /**
   * Steps definition for tax calculation
   */
  getSteps() {
    return [
      {
        field: 'salaryIncome',
        question: 'What is your annual salary income?',
        questionHindi: 'आपकी सालाना सैलरी कितनी है?',
        example: 'For example: 12 lakh or 1200000',
        required: true
      },
      {
        field: 'otherIncome',
        question: 'Do you have any other taxable income like rental income, interest, or freelance? If yes, how much annually? Say zero if none.',
        questionHindi: 'क्या आपकी कोई अन्य आय है जैसे किराया, ब्याज, या फ्रीलांस? अगर हां, तो कितनी? अगर नहीं तो शून्य बोलें।',
        example: 'For example: 1 lakh or zero',
        required: true
      },
      {
        field: 'section80C',
        question: 'How much have you invested in 80C deductions? This includes PF, PPF, ELSS, LIC, tuition fees. Maximum limit is 1.5 lakh.',
        questionHindi: '80C में कितना निवेश किया है? इसमें PF, PPF, ELSS, LIC, ट्यूशन फीस शामिल है। अधिकतम सीमा 1.5 लाख है।',
        example: 'For example: 1.5 lakh or 150000',
        required: true,
        maxLimit: 150000
      },
      {
        field: 'otherDeductions',
        question: 'Any other deductions like HRA, education loan interest, or charitable donations? Say the total amount or zero if none.',
        questionHindi: 'कोई अन्य छूट जैसे HRA, एजुकेशन लोन ब्याज, या दान? कुल राशि बताएं या शून्य बोलें।',
        example: 'For example: 20000 or zero',
        required: false
      }
    ];
  }

  /**
   * Handle user input and progress through steps
   */
  async handle(task, context) {
    const userId = context.userId || 'default';
    const userInput = task.query;
    const session = this.getSession(userId);
    const steps = this.getSteps();

    console.log(`[TaxCalculator] User: ${userId}, Step: ${session.step}, AwaitingInput: ${session.awaitingInput}, Input: "${userInput}"`);

    // Check if this is a fresh start (not waiting for input yet)
    if (!session.awaitingInput) {
      // First interaction - ask for salary
      session.awaitingInput = true;
      this.sessions.set(userId, session);
      
      console.log(`[TaxCalculator] Starting fresh - Asking first question (${steps[0].field})`);
      
      return {
        success: true,
        isMultiStep: true,
        currentStep: 0,
        totalSteps: steps.length,
        response: `Let's calculate your tax! ${steps[0].question}`,
        responseHindi: `चलिए आपका टैक्स कैलकुलेट करते हैं! ${steps[0].questionHindi}`,
        awaitingInput: true,
        field: steps[0].field
      };
    }

    // We are awaiting input - parse the user's response
    const amount = this.parseAmount(userInput);
    
    if (amount === null) {
      // Could not understand the amount, ask again
      const currentStep = steps[session.step];
      return {
        success: true,
        isMultiStep: true,
        currentStep: session.step,
        totalSteps: steps.length,
        response: `I didn't catch that. Please say the amount clearly. ${currentStep.question} ${currentStep.example}`,
        responseHindi: `मुझे समझ नहीं आया। कृपया राशि स्पष्ट बताएं। ${currentStep.questionHindi}`,
        awaitingInput: true,
        field: currentStep.field
      };
    }

    // Store the current step's data
    const currentStep = steps[session.step];
    let validatedAmount = amount;
    
    // Apply max limits if defined
    if (currentStep.maxLimit && amount > currentStep.maxLimit) {
      validatedAmount = currentStep.maxLimit;
      console.log(`[TaxCalculator] Amount ${amount} capped to max limit ${currentStep.maxLimit}`);
    }
    
    session.data[currentStep.field] = validatedAmount;
    session.step++;
    console.log(`[TaxCalculator] Stored ${currentStep.field}: ₹${validatedAmount}, Moving to step ${session.step}`);

    // Check if we have more steps
    if (session.step < steps.length) {
      const nextStep = steps[session.step];
      this.sessions.set(userId, session);
      
      return {
        success: true,
        isMultiStep: true,
        currentStep: session.step,
        totalSteps: steps.length,
        response: `Got it! ₹${this.formatAmount(validatedAmount)} noted. Now, ${nextStep.question}`,
        responseHindi: `ठीक है! ₹${this.formatAmount(validatedAmount)} नोट किया। अब, ${nextStep.questionHindi}`,
        awaitingInput: true,
        field: nextStep.field,
        collectedData: { ...session.data }
      };
    }

    // All inputs collected - calculate tax
    session.completed = true;
    const taxResult = this.calculateTax(session.data);
    
    // Clear the session after completion
    this.sessions.delete(userId);

    return {
      success: true,
      isMultiStep: false,
      completed: true,
      response: this.buildFinalResponse(session.data, taxResult),
      responseHindi: this.buildFinalResponseHindi(session.data, taxResult),
      taxResult,
      inputData: session.data
    };
  }

  /**
   * Parse amount from voice input
   */
  parseAmount(input) {
    if (!input) return null;
    
    const text = input.toLowerCase().trim();
    
    // Handle "zero", "nil", "nothing", "none"
    if (/^(zero|nil|nothing|none|no|nahi|nhin|kuch nahi|शून्य|नहीं)$/i.test(text)) {
      return 0;
    }

    // Handle lakh/lac notation
    let amount = null;
    
    // Pattern: "12 lakh", "1.5 lakh", "twelve lakh"
    const lakhMatch = text.match(/(\d+\.?\d*)\s*(lakh|lac|l)/i);
    if (lakhMatch) {
      amount = parseFloat(lakhMatch[1]) * 100000;
      return amount;
    }

    // Pattern: "50 thousand", "50k", "fifty thousand"
    const thousandMatch = text.match(/(\d+\.?\d*)\s*(thousand|k|हजार)/i);
    if (thousandMatch) {
      amount = parseFloat(thousandMatch[1]) * 1000;
      return amount;
    }

    // Direct number: "1200000", "150000"
    const directNumber = text.match(/(\d+)/);
    if (directNumber) {
      amount = parseInt(directNumber[1]);
      return amount;
    }

    // Word numbers
    const wordToNum = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
      'twenty five': 25, 'thirty': 30, 'forty': 40, 'forty five': 45,
      'fifty': 50, 'seventy five': 75, 'hundred': 100
    };

    for (const [word, num] of Object.entries(wordToNum)) {
      if (text.includes(word)) {
        if (text.includes('lakh') || text.includes('lac')) {
          return num * 100000;
        } else if (text.includes('thousand') || text.includes('k')) {
          return num * 1000;
        }
        return num;
      }
    }

    return null;
  }

  /**
   * Calculate tax under both Old and New regimes
   */
  calculateTax(data) {
    const salaryIncome = data.salaryIncome || 0;
    const otherIncome = data.otherIncome || 0;
    const totalGrossIncome = salaryIncome + otherIncome;

    // Standard deduction (available in both regimes now)
    const standardDeduction = 50000;

    // Deductions (only for Old Regime)
    const section80C = Math.min(data.section80C || 0, 150000);
    const otherDeductions = data.otherDeductions || 0;

    const totalDeductionsOldRegime = standardDeduction + section80C + otherDeductions;
    const totalDeductionsNewRegime = standardDeduction; // Only standard deduction in new regime

    // Calculate taxable income
    const taxableIncomeOld = Math.max(0, totalGrossIncome - totalDeductionsOldRegime);
    const taxableIncomeNew = Math.max(0, totalGrossIncome - totalDeductionsNewRegime);

    // Calculate tax under Old Regime (FY 2024-25)
    const oldRegimeTax = this.calculateOldRegimeTax(taxableIncomeOld);
    const oldRegimeCess = oldRegimeTax * 0.04;
    const oldRegimeTotalTax = oldRegimeTax + oldRegimeCess;

    // Calculate tax under New Regime (FY 2024-25)
    const newRegimeTax = this.calculateNewRegimeTax(taxableIncomeNew);
    const newRegimeCess = newRegimeTax * 0.04;
    const newRegimeTotalTax = newRegimeTax + newRegimeCess;

    // Determine which regime is better
    const savings = Math.abs(oldRegimeTotalTax - newRegimeTotalTax);
    const recommendedRegime = oldRegimeTotalTax <= newRegimeTotalTax ? 'old' : 'new';

    return {
      grossIncome: totalGrossIncome,
      
      oldRegime: {
        taxableIncome: taxableIncomeOld,
        deductions: totalDeductionsOldRegime,
        taxBeforeCess: Math.round(oldRegimeTax),
        cess: Math.round(oldRegimeCess),
        totalTax: Math.round(oldRegimeTotalTax),
        effectiveRate: totalGrossIncome > 0 
          ? ((oldRegimeTotalTax / totalGrossIncome) * 100).toFixed(1) 
          : 0
      },
      
      newRegime: {
        taxableIncome: taxableIncomeNew,
        deductions: totalDeductionsNewRegime,
        taxBeforeCess: Math.round(newRegimeTax),
        cess: Math.round(newRegimeCess),
        totalTax: Math.round(newRegimeTotalTax),
        effectiveRate: totalGrossIncome > 0 
          ? ((newRegimeTotalTax / totalGrossIncome) * 100).toFixed(1) 
          : 0
      },
      
      recommendation: {
        regime: recommendedRegime,
        savings: Math.round(savings),
        reason: recommendedRegime === 'old' 
          ? `Old regime saves ₹${this.formatAmount(savings)} due to your deductions`
          : `New regime saves ₹${this.formatAmount(savings)} with lower tax slabs`
      }
    };
  }

  /**
   * Old Regime Tax Slabs (FY 2024-25)
   */
  calculateOldRegimeTax(taxableIncome) {
    if (taxableIncome <= 250000) return 0;
    if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
    if (taxableIncome <= 1000000) return 12500 + (taxableIncome - 500000) * 0.20;
    return 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
  }

  /**
   * New Regime Tax Slabs (FY 2024-25)
   */
  calculateNewRegimeTax(taxableIncome) {
    if (taxableIncome <= 300000) return 0;
    if (taxableIncome <= 700000) return (taxableIncome - 300000) * 0.05;
    if (taxableIncome <= 1000000) return 20000 + (taxableIncome - 700000) * 0.10;
    if (taxableIncome <= 1200000) return 20000 + 30000 + (taxableIncome - 1000000) * 0.15;
    if (taxableIncome <= 1500000) return 20000 + 30000 + 30000 + (taxableIncome - 1200000) * 0.20;
    return 20000 + 30000 + 30000 + 60000 + (taxableIncome - 1500000) * 0.30;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount) {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString('en-IN');
  }

  /**
   * Build final response in English
   */
  buildFinalResponse(data, result) {
    const { oldRegime, newRegime, recommendation } = result;
    
    let response = `Tax Calculation Complete! `;
    response += `Your gross income is ₹${this.formatAmount(result.grossIncome)}. `;
    response += `Under Old Regime: Taxable income is ₹${this.formatAmount(oldRegime.taxableIncome)}, Tax is ₹${this.formatAmount(oldRegime.totalTax)}. `;
    response += `Under New Regime: Taxable income is ₹${this.formatAmount(newRegime.taxableIncome)}, Tax is ₹${this.formatAmount(newRegime.totalTax)}. `;
    response += `${recommendation.reason}. `;
    response += `I recommend the ${recommendation.regime.toUpperCase()} REGIME for you.`;
    
    return response;
  }

  /**
   * Build final response in Hindi
   */
  buildFinalResponseHindi(data, result) {
    const { oldRegime, newRegime, recommendation } = result;
    
    let response = `टैक्स कैलकुलेशन पूरा हुआ! `;
    response += `आपकी कुल आय ₹${this.formatAmount(result.grossIncome)} है। `;
    response += `पुरानी व्यवस्था में: कर योग्य आय ₹${this.formatAmount(oldRegime.taxableIncome)} है, टैक्स ₹${this.formatAmount(oldRegime.totalTax)} है। `;
    response += `नई व्यवस्था में: कर योग्य आय ₹${this.formatAmount(newRegime.taxableIncome)} है, टैक्स ₹${this.formatAmount(newRegime.totalTax)} है। `;
    
    if (recommendation.regime === 'old') {
      response += `पुरानी व्यवस्था से ₹${this.formatAmount(recommendation.savings)} बचत होगी। `;
      response += `मैं पुरानी व्यवस्था की सलाह देता हूं।`;
    } else {
      response += `नई व्यवस्था से ₹${this.formatAmount(recommendation.savings)} बचत होगी। `;
      response += `मैं नई व्यवस्था की सलाह देता हूं।`;
    }
    
    return response;
  }

  /**
   * Reset/cancel an ongoing session
   */
  cancelSession(userId) {
    if (this.sessions.has(userId)) {
      this.sessions.delete(userId);
      return true;
    }
    return false;
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(userId) {
    const session = this.sessions.get(userId);
    return session && !session.completed && session.awaitingInput;
  }

  /**
   * Get session status
   */
  getSessionStatus(userId) {
    const session = this.sessions.get(userId);
    if (!session) return null;
    
    return {
      step: session.step,
      totalSteps: this.getSteps().length,
      collectedData: session.data,
      completed: session.completed
    };
  }
}

export default TaxCalculatorAgent;
