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
  async handleQuery(userQuery, conversationId, userLanguage = null) {
    try {
      console.log(`\n[MasterAgent] Processing query: "${userQuery}"`);

      // Step 1: Detect language if not provided
      if (!userLanguage) {
        userLanguage = await languageManager.detectLanguage(userQuery);
        console.log(`[MasterAgent] Detected language: ${userLanguage}`);
      }

      // Update context
      contextManager.updateLanguage(conversationId, userLanguage);
      contextManager.addToHistory(conversationId, 'user', userQuery);

      // Step 2: Translate to English for processing
      let queryInEnglish = userQuery;
      if (userLanguage !== 'en') {
        queryInEnglish = await languageManager.translateToEnglish(userQuery, userLanguage);
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
        return await this.handleUnknownIntent(userQuery, userLanguage);
      }

      // Step 5: Execute agents
      const context = contextManager.getContext(conversationId);
      const agentOutputs = await this.collaborationManager.orchestrate(
        agentNames,
        { query: queryInEnglish, originalQuery: userQuery, intent },
        context
      );

      console.log(`[MasterAgent] Agent execution complete`);

      // Step 6: Merge responses
      const mergedResponse = await this.mergeResponses(agentOutputs, queryInEnglish);
      console.log(`[MasterAgent] Responses merged`);

      // Step 7: Generate final response
      const finalResponse = await this.generateFinalResponse(
        mergedResponse,
        userLanguage,
        intent
      );

      console.log(`[MasterAgent] Final response generated`);

      // Add to history
      contextManager.addToHistory(conversationId, 'assistant', finalResponse);
      await eventBus.emit(EVENTS.RESPONSE_READY, { conversationId, response: finalResponse });

      return {
        success: true,
        response: finalResponse,
        language: userLanguage,
        intent: intent.intent,
        agentsUsed: agentNames,
      };
    } catch (error) {
      console.error('[MasterAgent] Error:', error);
      return {
        success: false,
        error: error.message,
        response: await this.getErrorResponse(userLanguage),
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
  async mergeResponses(agentOutputs, query) {
    const insights = this.collaborationManager.extractInsights(agentOutputs);

    // Create a comprehensive summary
    const summary = {
      query,
      agents: agentOutputs.map(o => o.agent),
      insights,
      timestamp: Date.now(),
    };

    return summary;
  }

  /**
   * Generate final natural language response
   */
  async generateFinalResponse(mergedData, language, intent) {
    try {
      const prompt = `Based on the following financial analysis, provide a clear, helpful response to the user.

User's Question Type: ${intent.intent}

Analysis Results:
${JSON.stringify(mergedData.insights, null, 2)}

Create a natural, conversational response that:
1. Directly answers the user's question
2. Provides specific actionable advice
3. Highlights key insights from the analysis
4. Is concise but informative (2-3 sentences)

Respond in English first.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.MASTER_AGENT },
          { role: 'user', content: prompt },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 400,
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
