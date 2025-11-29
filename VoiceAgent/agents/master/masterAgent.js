/**
 * Master Agent - Main orchestrator for financial intelligence
 */

import Groq from 'groq-sdk';
import { config } from '../../config/env.js';
import { SYSTEM_PROMPTS } from '../../core/prompts.js';
import { taskRouter } from './taskRouter.js';
import { CollaborationManager } from './collaborationManager.js';
import { languageManager } from './languageManager.js';
import { contextManager } from '../../core/contextManager.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export class MasterAgent {
  constructor(agentRegistry) {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
    this.collaborationManager = new CollaborationManager(agentRegistry);
    this.name = 'MasterAgent';
  }

  /**
   * Main entry point - handles user query
   */
  async handleQuery(userQuery, conversationId, userContext = {}) {
    try {
      console.log(`\n[MasterAgent] Processing query: "${userQuery}"`);
      
      const userLanguage = userContext.language || null;

      // Step 1: Detect language if not provided
      let detectedLanguage = userLanguage;
      if (!detectedLanguage) {
        detectedLanguage = await languageManager.detectLanguage(userQuery);
        console.log(`[MasterAgent] Detected language: ${detectedLanguage}`);
      }

      // Update context with user info
      contextManager.updateLanguage(conversationId, detectedLanguage);
      contextManager.addToHistory(conversationId, 'user', userQuery);
      
      // Add user profile to context
      if (userContext.userName) {
        console.log(`[MasterAgent] User identified: ${userContext.userName}`);
      }

      // Step 2: Translate to English for processing
      let queryInEnglish = userQuery;
      if (detectedLanguage !== 'en') {
        queryInEnglish = await languageManager.translateToEnglish(userQuery, detectedLanguage);
        console.log(`[MasterAgent] Translated to English: "${queryInEnglish}"`);
      }

      // Step 3: Detect intent
      const intent = await this.detectIntent(queryInEnglish);
      console.log(`[MasterAgent] Detected intent:`, intent);

      contextManager.updateIntent(conversationId, intent);
      await eventBus.emit(EVENTS.INTENT_DETECTED, { conversationId, intent });

      // Step 4: Map to agents
      const agentNames = taskRouter.mapIntentToAgents(intent.intent);
      console.log(`[MasterAgent] Delegating to agents:`, agentNames);

      if (agentNames.length === 0) {
        return await this.handleUnknownIntent(userQuery, detectedLanguage);
      }

      // Step 5: Execute agents with user context
      const context = {
        ...contextManager.getContext(conversationId),
        userContext // Include user profile, tax info, transactions
      };
      
      const agentOutputs = await this.collaborationManager.orchestrate(
        agentNames,
        { query: queryInEnglish, originalQuery: userQuery, intent },
        context
      );

      console.log(`[MasterAgent] Agent execution complete`);

      // Step 6: Merge responses with personalization
      const mergedResponse = await this.mergeResponses(agentOutputs, queryInEnglish, userContext);
      console.log(`[MasterAgent] Responses merged`);

      // Step 7: Generate final response
      const finalResponse = await this.generateFinalResponse(
        mergedResponse,
        detectedLanguage,
        intent,
        userContext
      );

      console.log(`[MasterAgent] Final response generated`);

      // Add to history
      contextManager.addToHistory(conversationId, 'assistant', finalResponse);
      await eventBus.emit(EVENTS.RESPONSE_READY, { conversationId, response: finalResponse });

      return {
        success: true,
        response: finalResponse,
        language: detectedLanguage,
        intent: intent.intent,
        agentsUsed: agentNames,
        extractedData: intent.entities || {}
      };
    } catch (error) {
      console.error('[MasterAgent] Error:', error);
      return {
        success: false,
        error: error.message,
        response: await this.getErrorResponse(detectedLanguage || 'hi'),
      };
    }
  }

  /**
   * Detect user intent from query
   */
  async detectIntent(query) {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.INTENT_DETECTION },
          { role: 'user', content: query },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        intent: result.intent || 'unknown',
        confidence: result.confidence || 0.5,
        language: result.language || 'en',
        entities: result.entities || [],
      };
    } catch (error) {
      console.error('Intent detection error:', error);
      return {
        intent: 'unknown',
        confidence: 0,
        language: 'en',
        entities: [],
      };
    }
  }

  /**
   * Merge responses from multiple agents
   */
  async mergeResponses(agentOutputs, query, userContext = {}) {
    const insights = this.collaborationManager.extractInsights(agentOutputs);

    // Create a comprehensive summary with user context
    const summary = {
      query,
      agents: agentOutputs.map(o => o.agent),
      insights,
      userContext: {
        name: userContext.userName,
        monthlyIncome: userContext.monthlySummary?.income,
        monthlyExpenses: userContext.monthlySummary?.expenses,
        taxRegime: userContext.taxProfile?.recommendedRegime
      },
      timestamp: Date.now(),
    };

    return summary;
  }

  /**
   * Generate final natural language response
   */
  async generateFinalResponse(mergedData, language, intent, userContext = {}) {
    try {
      // Build personalized context
      let contextInfo = '';
      if (userContext.userName) {
        contextInfo += `User's Name: ${userContext.userName}\n`;
      }
      if (userContext.monthlySummary) {
        contextInfo += `Monthly Income: ₹${userContext.monthlySummary.income || 0}\n`;
        contextInfo += `Monthly Expenses: ₹${userContext.monthlySummary.expenses || 0}\n`;
        contextInfo += `Net Savings: ₹${userContext.monthlySummary.netSavings || 0}\n`;
      }
      if (userContext.taxProfile) {
        contextInfo += `Tax Regime: ${userContext.taxProfile.recommendedRegime || 'new'}\n`;
        contextInfo += `Salary Income: ₹${userContext.taxProfile.salaryIncome || 0}\n`;
        contextInfo += `Section 80C: ₹${userContext.taxProfile.section80C || 0}\n`;
      }
      
      const prompt = `Based on the following financial analysis, provide a clear, helpful PERSONALIZED response to the user.

User's Question Type: ${intent.intent}

${contextInfo ? `User Profile (FROM MONGODB DATABASE):\n${contextInfo}\n` : ''}
Analysis Results:
${JSON.stringify(mergedData.insights, null, 2)}

CRITICAL REQUIREMENTS:
1. Your response MUST be EXACTLY 70 words or less. Count carefully.
2. ALWAYS cite ACTUAL numbers from the user's MongoDB profile above
3. If user has financial data in MongoDB, use those EXACT values (income: ₹X, expenses: ₹Y, tax: ₹Z)
4. Never say generic phrases like "based on your income" - say "based on your ₹${userContext.taxProfile?.salaryIncome || 'X'} income"
5. Prioritize REAL DATA over analysis results

Create a natural, conversational response that:
1. Addresses the user by name if available (use "ji" suffix in Hindi context)
2. Uses their ACTUAL financial data from MongoDB with specific numbers
3. Provides specific actionable advice based on their real profile
4. Highlights the most important insight with real figures
5. Keep it informative yet concise - maximum 70 words

Respond in English first. DO NOT EXCEED 70 WORDS. USE REAL NUMBERS FROM MONGODB.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.MASTER_AGENT },
          { role: 'user', content: prompt },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 200,
      });

      let response = completion.choices[0]?.message?.content || 'I have processed your request.';

      // Translate to target language
      if (language !== 'en') {
        response = await languageManager.translate(response, language);
      }

      return response;
    } catch (error) {
      console.error('Response generation error:', error);
      return await this.getErrorResponse(language);
    }
  }

  /**
   * Handle unknown intents
   */
  async handleUnknownIntent(query, language) {
    const defaultResponse = "I'm not sure how to help with that. I can help you with expenses, taxes, investments, and income tracking.";
    
    const response = language === 'en' 
      ? defaultResponse 
      : await languageManager.translate(defaultResponse, language);

    return {
      success: true,
      response,
      language,
      intent: 'unknown',
      agentsUsed: [],
    };
  }

  /**
   * Get error response in user's language
   */
  async getErrorResponse(language) {
    const errorMsg = "I encountered an error processing your request. Please try again.";
    
    return language === 'en'
      ? errorMsg
      : await languageManager.translate(errorMsg, language);
  }
}

export default MasterAgent;
