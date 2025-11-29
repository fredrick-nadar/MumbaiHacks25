/**
 * Test Tax Calculator Flow
 * Simulates a complete tax calculation conversation
 */

import { TaxCalculatorAgent } from './agents/slaves/tax/taxCalculatorAgent.js';

const agent = new TaxCalculatorAgent();
const userId = 'test-user-' + Date.now();

console.log('=== TAX CALCULATOR CONVERSATION TEST ===\n');
console.log('Simulating user: Kamraan calling to calculate tax\n');
console.log('===========================================\n');

async function runConversation() {
  try {
    // Step 1: User says "मेरा टैक्स कैलकुलेट करो"
    console.log('👤 User: "मेरा टैक्स कैलकुलेट करो"\n');
    let result = await agent.handle({ query: 'मेरा टैक्स कैलकुलेट करो' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('');

    // Step 2: Salary Income
    console.log('👤 User: "12 lakh"\n');
    result = await agent.handle({ query: '12 lakh' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('   Collected so far:', JSON.stringify(result.collectedData, null, 2));
    console.log('');

    // Step 3: Other Income
    console.log('👤 User: "one lakh"\n');
    result = await agent.handle({ query: 'one lakh' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('');

    // Step 4: 80C Investments
    console.log('👤 User: "1.5 lakh"\n');
    result = await agent.handle({ query: '1.5 lakh' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('');

    // Step 5: 80D Medical Premium
    console.log('👤 User: "45 thousand"\n');
    result = await agent.handle({ query: '45 thousand' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('');

    // Step 6: Home Loan Interest
    console.log('👤 User: "1.8 lakh"\n');
    result = await agent.handle({ query: '1.8 lakh' }, { userId });
    console.log('🤖 Agent:', result.response);
    console.log('   Awaiting:', result.field);
    console.log('   Step:', result.currentStep + 1, '/', result.totalSteps);
    console.log('');

    // Step 7: Other Deductions
    console.log('👤 User: "20000"\n');
    result = await agent.handle({ query: '20000' }, { userId });
    console.log('');
    console.log('===========================================');
    console.log('✅ TAX CALCULATION COMPLETE!');
    console.log('===========================================\n');
    console.log('🤖 Agent:', result.response);
    console.log('');
    console.log('📊 TAX RESULT:\n');
    console.log(JSON.stringify(result.taxResult, null, 2));
    console.log('');
    console.log('===========================================');
    console.log('📝 INPUT DATA COLLECTED:\n');
    console.log(JSON.stringify(result.inputData, null, 2));
    console.log('===========================================\n');

    // Summary
    const { oldRegime, newRegime, recommendation } = result.taxResult;
    console.log('📌 SUMMARY:');
    console.log(`   Gross Income: ₹${formatINR(result.taxResult.grossIncome)}`);
    console.log(`   Old Regime Tax: ₹${formatINR(oldRegime.totalTax)} (${oldRegime.effectiveRate}% rate)`);
    console.log(`   New Regime Tax: ₹${formatINR(newRegime.totalTax)} (${newRegime.effectiveRate}% rate)`);
    console.log(`   💰 Recommendation: ${recommendation.regime.toUpperCase()} REGIME`);
    console.log(`   💵 Savings: ₹${formatINR(recommendation.savings)}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

// Run the test
runConversation();
