// Background script for TaxWise Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('TaxWise Assistant extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    extensionInstalled: true,
    installDate: new Date().toISOString()
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDashboard') {
    chrome.tabs.create({ url: 'https://taxwise.app/dashboard' });
  } else if (request.action === 'openLoginPage') {
    chrome.tabs.create({ url: 'http://localhost:5173/aadhaar-auth?mode=login' });
  } else if (request.type === 'TAX_WISE_DATA') {
    // Data from content script - store it for popup access
    chrome.storage.local.set({
      taxWisePageData: request,
      lastContentUpdate: new Date().toISOString()
    });
    
    console.log('TaxWise Extension: Received data from content script', request);
  }
  
  return true; // Keep message channel open for async response
});