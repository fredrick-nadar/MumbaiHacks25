import React, { useState, useEffect } from 'react';
import { 
  User, 
  DollarSign, 
  FileText, 
  Calendar, 
  ExternalLink, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import '../popup.css';

function App() {
  const [userState, setUserState] = useState({
    loading: true,
    error: null,
    isLoggedIn: false,
    currentUser: null,
    lastLoginTime: null,
    taxSummary: null
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setUserState(prev => ({ ...prev, loading: true, error: null }));
      
      // Initialize API service
      const api = new window.TaxWiseAPI();
      
      // Get current active tab to check if user is on TaxWise
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isTaxWisePage = tab?.url?.includes('taxwise.app') || tab?.url?.includes('localhost');
      
      if (isTaxWisePage) {
        // First, try to get data from content script
        const contentData = await chrome.storage.local.get([
          'taxWisePageData', 
          'lastContentUpdate'
        ]);
        
        let pageData = null;
        
        if (contentData.taxWisePageData && contentData.lastContentUpdate) {
          const lastUpdate = new Date(contentData.lastContentUpdate);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          // Use content script data if it's recent (within 5 minutes)
          if (lastUpdate > fiveMinutesAgo) {
            pageData = {
              isLoggedIn: contentData.taxWisePageData.userInfo.isLoggedIn,
              currentUser: contentData.taxWisePageData.userInfo.currentUser,
              pageUrl: contentData.taxWisePageData.url,
              taxData: contentData.taxWisePageData.taxData
            };
          }
        }
        
        // Fallback to executeScript if no recent content script data
        if (!pageData) {
          try {
            const results = await chrome.tabs.executeScript(tab.id, {
              code: `
                (function() {
                  // Check for authentication indicators
                  const userElements = document.querySelectorAll('[data-user], .user-name, .username, #user-info');
                  const authTokens = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                  
                  // Look for specific user indicators
                  const pageText = document.body.innerText;
                  const isDhaval = pageText.includes('Dhaval') || pageText.includes('dhaval');
                  const isFredrick = pageText.includes('Fredrick') || pageText.includes('fredrick') || pageText.includes('Frederick');
                  
                  return {
                    isLoggedIn: !!(authTokens || userElements.length > 0 || isDhaval || isFredrick),
                    currentUser: isDhaval ? 'Dhaval Khandhadia' : isFredrick ? 'Fredrick Nadar' : null,
                    pageUrl: window.location.href,
                    hasAuthElements: userElements.length > 0,
                    hasAuthTokens: !!authTokens
                  };
                })();
              `
            });
            
            if (results && results[0]) {
              pageData = results[0];
            }
          } catch (error) {
            console.warn('Could not execute script on page:', error);
          }
        }
        
        if (pageData) {
          // Try to get real data from API
          try {
            const authStatus = await api.checkAuth();
            
            if (authStatus.isAuthenticated) {
              // Get real dashboard data
              const [dashboardData, taxProfile] = await Promise.all([
                api.getDashboardSummary().catch(() => null),
                api.getTaxProfile().catch(() => null)
              ]);
              
              // Format tax summary from real API data
              let taxSummary = null;
              if (dashboardData || taxProfile) {
                taxSummary = {
                  totalIncome: dashboardData?.yearlyIncome ? `₹${dashboardData.yearlyIncome.toLocaleString()}` : 'N/A',
                  taxOwed: taxProfile?.calculatedTax ? `₹${taxProfile.calculatedTax.toLocaleString()}` : 'N/A',
                  refundAmount: taxProfile?.expectedRefund ? `₹${taxProfile.expectedRefund.toLocaleString()}` : 'N/A',
                  filingStatus: taxProfile?.filingStatus || 'Individual',
                  lastUpdated: new Date().toLocaleDateString(),
                  documentsUploaded: dashboardData?.documentsCount || 0,
                  completionStatus: taxProfile?.completionPercentage || 0
                };
              }
              
              const userData = {
                loading: false,
                error: null,
                isLoggedIn: true,
                currentUser: authStatus.user?.name || pageData.currentUser || 'User',
                lastLoginTime: new Date().toISOString(),
                taxSummary
              };
              
              setUserState(userData);
              
              // Store the data
              chrome.storage.local.set({
                lastLoginTime: userData.lastLoginTime,
                currentUser: userData.currentUser,
                taxSummary: userData.taxSummary,
                authToken: api.token
              });
              
              return; // Exit early since we got real data
            }
          } catch (apiError) {
            console.warn('API data fetch failed, using fallback:', apiError);
          }
          
          // Fallback to stored/mock data if API fails
          const stored = await chrome.storage.local.get([
            'lastLoginTime', 
            'currentUser', 
            'taxSummary'
          ]);
          
          // Use stored data or fallback mock data
          const fallbackTaxSummary = stored.taxSummary || {
            totalIncome: '₹75,240',
            taxOwed: '₹12,486',
            refundAmount: '₹2,340',
            filingStatus: 'Individual',
            lastUpdated: new Date().toLocaleDateString(),
            documentsUploaded: 0,
            completionStatus: 0
          };
          
          setUserState({
            loading: false,
            error: null,
            isLoggedIn: pageData.isLoggedIn,
            currentUser: pageData.currentUser || stored.currentUser || 'Unknown User',
            lastLoginTime: stored.lastLoginTime || new Date().toISOString(),
            taxSummary: fallbackTaxSummary
          });
        }
      } else {
        // Not on TaxWise page, check stored data
        const stored = await chrome.storage.local.get([
          'lastLoginTime', 
          'currentUser', 
          'taxSummary'
        ]);
        
        setUserState({
          loading: false,
          error: null,
          isLoggedIn: !!(stored.currentUser && stored.lastLoginTime),
          currentUser: stored.currentUser,
          lastLoginTime: stored.lastLoginTime,
          taxSummary: stored.taxSummary
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserState({
        loading: false,
        error: 'Failed to load user data',
        isLoggedIn: false,
        currentUser: null,
        lastLoginTime: null,
        taxSummary: null
      });
    }
  };

  const openTaxWise = () => {
    chrome.tabs.create({ url: 'https://taxwise.app/dashboard' });
  };

  const openLoginPage = () => {
    chrome.tabs.create({ url: 'http://localhost:5173/aadhaar-auth?mode=login' });
  };

  const refreshData = () => {
    loadUserData();
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatLastLogin = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (userState.loading) {
    return (
      <div className="app">
        <div className="header">
          <div className="logo">TW</div>
          <div className="header-text">
            <h1 className="app-name">TaxWise</h1>
            <p className="app-tagline">Tax Management Assistant</p>
          </div>
        </div>
        <div className="content">
          <div className="loading">
            <RefreshCw className="action-icon" style={{ animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (userState.error) {
    return (
      <div className="app">
        <div className="header">
          <div className="logo">TW</div>
          <div className="header-text">
            <h1 className="app-name">TaxWise</h1>
            <p className="app-tagline">Tax Management Assistant</p>
          </div>
        </div>
        <div className="content">
          <div className="error">
            <AlertCircle className="action-icon" />
            {userState.error}
          </div>
          <button className="action-button" onClick={refreshData}>
            <RefreshCw className="action-icon" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userState.isLoggedIn) {
    return (
      <div className="app">
        <div className="header">
          <div className="logo">TW</div>
          <div className="header-text">
            <h1 className="app-name">TaxWise</h1>
            <p className="app-tagline">Tax Management Assistant</p>
          </div>
        </div>
        <div className="content">
          <div className="not-logged-in">
            <h3>Welcome to TaxWise</h3>
            <p>Please log in to view your tax information and manage your account.</p>
            <button className="login-button" onClick={openLoginPage}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">TW</div>
        <div className="header-text">
          <h1 className="app-name">TaxWise</h1>
          <p className="app-tagline">Tax Management Assistant</p>
        </div>
        <button 
          className="action-button" 
          onClick={refreshData}
          style={{ padding: '6px', minHeight: 'auto', margin: 0, width: 'auto' }}
        >
          <RefreshCw className="action-icon" />
        </button>
      </div>

      <div className="content">
        {/* User Info Card */}
        <div className="user-card">
          <div className="user-header">
            <div className="user-avatar">
              {getUserInitials(userState.currentUser)}
            </div>
            <div className="user-info">
              <h3>{userState.currentUser}</h3>
              <p>Last login: {formatLastLogin(userState.lastLoginTime)}</p>
            </div>
          </div>
          <div className="status-badge">
            <div className="status-dot"></div>
            Active Session
          </div>
        </div>

        {/* Tax Summary */}
        {userState.taxSummary && (
          <div className="stats-grid">
            <h3 className="stats-title">2024 Tax Summary</h3>
            <div className="stats-row">
              <span className="stat-label">Total Income</span>
              <span className="stat-value">{userState.taxSummary.totalIncome}</span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Tax Owed</span>
              <span className="stat-value">{userState.taxSummary.taxOwed}</span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Expected Refund</span>
              <span className="stat-value" style={{ color: '#16a34a' }}>
                {userState.taxSummary.refundAmount}
              </span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Filing Status</span>
              <span className="stat-value">{userState.taxSummary.filingStatus}</span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Documents</span>
              <span className="stat-value">{userState.taxSummary.documentsUploaded}/10</span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Completion</span>
              <span className="stat-value">{userState.taxSummary.completionStatus}%</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3 className="actions-title">Quick Actions</h3>
          
          <button className="action-button primary" onClick={openTaxWise}>
            <ExternalLink className="action-icon" />
            Open TaxWise Dashboard
          </button>
          
          <button className="action-button" onClick={() => chrome.tabs.create({ url: 'https://taxwise.app/documents' })}>
            <FileText className="action-icon" />
            Upload Documents
          </button>
          
          <button className="action-button" onClick={() => chrome.tabs.create({ url: 'https://taxwise.app/calculator' })}>
            <DollarSign className="action-icon" />
            Tax Calculator
          </button>
          
          <button className="action-button" onClick={() => chrome.tabs.create({ url: 'https://taxwise.app/schedule' })}>
            <Calendar className="action-icon" />
            Schedule Consultation
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;