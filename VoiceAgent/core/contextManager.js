/**
 * Context Manager - Manages conversation context
 */

import { memoryStore } from './memoryStore.js';
import { ConversationContextSchema } from './schema.js';

export class ContextManager {
  constructor() {
    this.contextPrefix = 'ctx:';
  }

  /**
   * Create or get conversation context
   */
  getContext(conversationId) {
    const key = `${this.contextPrefix}${conversationId}`;
    let context = memoryStore.get(key);

    if (!context) {
      context = {
        ...ConversationContextSchema,
        conversationId,
        userId: conversationId.split('-')[0] || 'unknown',
        history: [],
        metadata: {},
      };
      this.saveContext(conversationId, context);
    }

    return context;
  }

  /**
   * Save conversation context
   */
  saveContext(conversationId, context) {
    const key = `${this.contextPrefix}${conversationId}`;
    memoryStore.set(key, context, 3600); // 1 hour TTL
  }

  /**
   * Add message to conversation history
   */
  addToHistory(conversationId, role, content) {
    const context = this.getContext(conversationId);
    context.history.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Keep only last 10 messages
    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }

    this.saveContext(conversationId, context);
  }

  /**
   * Update current intent
   */
  updateIntent(conversationId, intent) {
    const context = this.getContext(conversationId);
    context.currentIntent = intent;
    this.saveContext(conversationId, context);
  }

  /**
   * Update language
   */
  updateLanguage(conversationId, language) {
    const context = this.getContext(conversationId);
    context.language = language;
    this.saveContext(conversationId, context);
  }

  /**
   * Add metadata
   */
  addMetadata(conversationId, key, value) {
    const context = this.getContext(conversationId);
    context.metadata[key] = value;
    this.saveContext(conversationId, context);
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId) {
    const context = this.getContext(conversationId);
    return context.history;
  }

  /**
   * Clear conversation context
   */
  clearContext(conversationId) {
    const key = `${this.contextPrefix}${conversationId}`;
    memoryStore.delete(key);
  }
}

export const contextManager = new ContextManager();
