// Content script for TaxWise Chrome Extension
// This script runs on TaxWise pages to better detect user authentication and data

(function() {
  'use strict';
  
  // Detect user authentication status and information
  function detectUserInfo() {
    const userInfo = {
      isLoggedIn: false,
      currentUser: null,
      userRole: null,
      pageType: null
    };
    
    // Check for authentication tokens
    const authToken = localStorage.getItem('authToken') || 
                     sessionStorage.getItem('authToken') ||
                     localStorage.getItem('token') ||
                     sessionStorage.getItem('token');
    
    if (authToken) {
      userInfo.isLoggedIn = true;
    }
    
    // Look for user name indicators in the page
    const pageText = document.body.innerText.toLowerCase();
    const pageHTML = document.body.innerHTML;
    
    // Check for specific users (Dhaval and Fredrick)
    if (pageText.includes('dhaval') || pageHTML.toLowerCase().includes('dhaval')) {
      userInfo.currentUser = 'Dhaval Khandhadia';
      userInfo.isLoggedIn = true;
    } else if (pageText.includes('fredrick') || pageText.includes('frederick') || 
               pageHTML.toLowerCase().includes('fredrick') || 
               pageHTML.toLowerCase().includes('frederick')) {
      userInfo.currentUser = 'Fredrick Nadar';
      userInfo.isLoggedIn = true;
    }
    
    // Detect common user info selectors
    const userSelectors = [
      '.user-name',
      '.username',
      '[data-user]',
      '#user-info',
      '.user-profile',
      '.account-info',
      '.user-display-name'
    ];
    
    for (const selector of userSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        userInfo.isLoggedIn = true;
        if (!userInfo.currentUser) {
          userInfo.currentUser = element.textContent.trim();
        }
        break;
      }
    }
    
    // Detect page type based on URL and content
    const url = window.location.href.toLowerCase();
    if (url.includes('/dashboard')) {
      userInfo.pageType = 'dashboard';
    } else if (url.includes('/login') || url.includes('/signin')) {
      userInfo.pageType = 'login';
    } else if (url.includes('/documents')) {
      userInfo.pageType = 'documents';
    } else if (url.includes('/calculator')) {
      userInfo.pageType = 'calculator';
    } else if (url.includes('/profile')) {
      userInfo.pageType = 'profile';
    }
    
    return userInfo;
  }
  
  // Extract tax-related data from the page
  function extractTaxData() {
    const taxData = {};
    
    // Look for common tax data patterns
    const patterns = {
      income: /total\s+income[:\s]*\$?([\d,]+\.?\d*)/i,
      taxOwed: /tax\s+owed[:\s]*\$?([\d,]+\.?\d*)/i,
      refund: /refund[:\s]*\$?([\d,]+\.?\d*)/i,
      filing: /filing\s+status[:\s]*([^<\n]+)/i
    };
    
    const pageText = document.body.innerText;
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = pageText.match(pattern);
      if (match) {
        taxData[key] = match[1] ? match[1].trim() : match[0].trim();
      }
    }
    
    return taxData;
  }
  
  // Send data to extension background script
  function sendDataToExtension() {
    const userInfo = detectUserInfo();
    const taxData = extractTaxData();
    
    // Also capture auth tokens for API access
    const authToken = localStorage.getItem('authToken') || 
                     sessionStorage.getItem('authToken') ||
                     localStorage.getItem('token') ||
                     sessionStorage.getItem('token');
    
    const data = {
      type: 'TAX_WISE_DATA',
      userInfo,
      taxData,
      authToken,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // Send to background script
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(data).catch(err => {
        // Extension might not be listening, that's okay
        console.log('TaxWise Extension: Could not send data to background script');
      });
    }
    
    // Store data in local storage for popup access
    chrome.storage.local.set({
      taxWiseData: data,
      lastUpdate: new Date().toISOString(),
      ...(authToken && { authToken })
    }).catch(err => {
      console.log('TaxWise Extension: Could not store data');
    });
  }
  
  // Run immediately
  sendDataToExtension();
  
  // Run when page content changes (for SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(sendDataToExtension, 1000); // Wait for page to settle
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Run periodically to catch dynamic updates
  setInterval(sendDataToExtension, 30000); // Every 30 seconds
  
  // Listen for form submissions (login, tax data updates)
  document.addEventListener('submit', () => {
    setTimeout(sendDataToExtension, 2000); // Wait for form processing
  });
  
  console.log('TaxWise Chrome Extension content script loaded');
})();