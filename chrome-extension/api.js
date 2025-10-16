// API service for TaxWise Chrome Extension
class TaxWiseAPI {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.token = null;
  }

  // Get auth token from localStorage or sessionStorage
  async getAuthToken() {
    try {
      // Try to get token from active tab's storage
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('localhost:5173')) {
        const results = await chrome.tabs.executeScript(tab.id, {
          code: `
            localStorage.getItem('authToken') || 
            sessionStorage.getItem('authToken') || 
            localStorage.getItem('token') || 
            sessionStorage.getItem('token')
          `
        });
        if (results && results[0]) {
          this.token = results[0];
          return this.token;
        }
      }
    } catch (error) {
      console.warn('Could not get auth token from page:', error);
    }
    
    // Fallback to extension storage
    const stored = await chrome.storage.local.get(['authToken']);
    if (stored.authToken) {
      this.token = stored.authToken;
      return this.token;
    }
    
    return null;
  }

  // Make authenticated API request
  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get dashboard summary
  async getDashboardSummary() {
    return await this.makeRequest('/api/dashboard/summary');
  }

  // Get tax profile
  async getTaxProfile() {
    return await this.makeRequest('/api/tax/profile');
  }

  // Get recent transactions
  async getRecentTransactions(limit = 5) {
    return await this.makeRequest(`/api/transactions/recent?limit=${limit}`);
  }

  // Get user profile
  async getUserProfile() {
    return await this.makeRequest('/api/auth/profile');
  }

  // Check authentication status
  async checkAuth() {
    try {
      const profile = await this.getUserProfile();
      return {
        isAuthenticated: true,
        user: profile
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null
      };
    }
  }
}

// Export for use in popup
window.TaxWiseAPI = TaxWiseAPI;