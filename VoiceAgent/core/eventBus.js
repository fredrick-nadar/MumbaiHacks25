/**
 * Event Bus - Simple event emitter for agent communication
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  async emit(event, data) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const promises = callbacks.map(callback => {
      try {
        return Promise.resolve(callback(data));
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Subscribe to an event once
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Clear all listeners for an event
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get all events
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event types
export const EVENTS = {
  AGENT_START: 'agent:start',
  AGENT_COMPLETE: 'agent:complete',
  AGENT_ERROR: 'agent:error',
  INTENT_DETECTED: 'intent:detected',
  RESPONSE_READY: 'response:ready',
  MEMORY_UPDATED: 'memory:updated',
};

export default EventBus;
