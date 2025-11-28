/**
 * Memory Store - Simple in-memory storage
 * In production, replace with Redis or MongoDB
 */

class MemoryStore {
  constructor() {
    this.store = new Map();
    this.expirationTimers = new Map();
  }

  /**
   * Set a value in memory
   */
  set(key, value, ttlSeconds = null) {
    this.store.set(key, {
      value,
      timestamp: Date.now(),
    });

    // Set expiration if TTL provided
    if (ttlSeconds) {
      this.setExpiration(key, ttlSeconds);
    }
  }

  /**
   * Get a value from memory
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry.value;
  }

  /**
   * Delete a key
   */
  delete(key) {
    const timer = this.expirationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(key);
    }
    return this.store.delete(key);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * Set expiration for a key
   */
  setExpiration(key, seconds) {
    const existingTimer = this.expirationTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.delete(key);
    }, seconds * 1000);

    this.expirationTimers.set(key, timer);
  }

  /**
   * Get all keys matching a pattern
   */
  keys(pattern = null) {
    const allKeys = Array.from(this.store.keys());
    if (!pattern) return allKeys;

    const regex = new RegExp(pattern);
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Clear all memory
   */
  clear() {
    // Clear all timers
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
    this.store.clear();
  }

  /**
   * Get memory size
   */
  size() {
    return this.store.size;
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();
export default MemoryStore;
