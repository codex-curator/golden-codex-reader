/**
 * Verilian Reader - Background Service Worker
 * Handles context menu and message passing
 */

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'verifyProvenance',
    title: 'Verify Golden Codex Provenance',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'verifyProvenance') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'verifyImage',
      imageUrl: info.srcUrl
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    // Store data for popup
    chrome.storage.local.set({
      pendingVerification: message.data
    });
  }
  return true;
});
