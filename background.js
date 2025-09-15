// Background service worker for Naver ID Auto Fill Extension

// Listen for messages from Raycast or other sources
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.action === 'fill_forms') {
      // Forward the trigger message to active tab (without data)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('nid.naver.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'fill_forms'
            // No data - content script will load from extension
          });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Not on naver login page' });
        }
      });
      return true; // Keep message channel open for async response
    }
  }
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.action === 'get_profile') {
      // Try to get profile from storage first, then from file
      chrome.storage.local.get(['profile'], async (result) => {
        if (result.profile) {
          sendResponse({ profile: result.profile });
        } else {
          // Load from extension's profile.json as fallback
          try {
            const response = await fetch(chrome.runtime.getURL('profile.json'));
            const profile = await response.json();
            sendResponse({ profile: profile });
          } catch (error) {
            console.error('Failed to load profile from file:', error);
            sendResponse({ profile: null });
          }
        }
      });
      return true;
    } else if (request.action === 'save_profile') {
      // Save profile data to storage
      chrome.storage.local.set({ profile: request.profile }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
  }
);

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Naver ID Auto Fill Extension installed');
});
