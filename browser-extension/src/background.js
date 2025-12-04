/**
 * Golden Codex Reader - Background Service Worker
 * Copyright (c) 2025 Metavolve Labs, Inc.
 */

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'goldenCodexRead',
    title: 'Read Golden Codex',
    contexts: ['image']
  });

  console.log('Golden Codex Reader: Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'goldenCodexRead') {
    // Store the image URL and open popup
    chrome.storage.local.set({ pendingImage: info.srcUrl }, () => {
      // Open the popup
      chrome.action.openPopup();
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'decodeImage') {
    // Store image and trigger popup
    chrome.storage.local.set({ pendingImage: request.imageUrl }, () => {
      chrome.action.openPopup();
    });
    sendResponse({ success: true });
  }

  if (request.action === 'getImageData') {
    // Fetch image data for content script
    fetch(request.imageUrl)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const uint8Array = new Uint8Array(buffer);
        const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
        sendResponse({ success: true, data: base64 });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }
});

// Log when service worker starts
console.log('Golden Codex Reader: Background service worker started');
