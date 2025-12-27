/**
 * Verilian Reader - Content Script
 * Scans pages for images with Golden Codex metadata
 */

// Badge styles
const BADGE_STYLES = {
  xmp: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', icon: '\u{1F4DC}' },
  hash: { bg: 'linear-gradient(135deg, #9B59B6, #8E44AD)', icon: '\u{1F50D}' },
  checking: { bg: '#888', icon: '\u231B' }
};

/**
 * Add Golden Codex badge to an image
 */
function addBadge(img, type, matchData = null) {
  // Skip if already badged
  if (img.dataset.gcxBadged) return;
  img.dataset.gcxBadged = 'true';

  const style = BADGE_STYLES[type];
  if (!style) return;

  // Create badge container
  const container = document.createElement('div');
  container.className = 'gcx-badge-container';
  container.style.cssText = 'position:absolute;top:8px;right:8px;z-index:9999;';

  // Create badge
  const badge = document.createElement('div');
  badge.className = 'gcx-badge';
  badge.style.cssText = 'background:' + style.bg + ';color:#fff;padding:4px 8px;' +
    'border-radius:12px;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);' +
    'display:flex;align-items:center;gap:4px;font-family:system-ui;';
  badge.innerHTML = style.icon + '<span>Golden Codex</span>';

  // Store match data
  if (matchData) {
    badge.dataset.matchData = JSON.stringify(matchData);
  }

  // Click to open popup
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    chrome.runtime.sendMessage({
      action: 'openPopup',
      data: {
        imageUrl: img.src,
        matchData: matchData
      }
    });
  });

  container.appendChild(badge);

  // Position container relative to image
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;display:inline-block;';
  img.parentNode.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  wrapper.appendChild(container);
}

/**
 * Check an image for Golden Codex metadata
 */
async function checkImage(img) {
  // Skip small images and already checked
  if (img.width < 100 || img.height < 100) return;
  if (img.dataset.gcxChecked) return;
  img.dataset.gcxChecked = 'true';

  try {
    // Try to load decoder and hash scripts
    if (!window.GoldenCodexAPI) {
      console.log('[GCX] API not loaded yet');
      return;
    }

    // Verify provenance
    const result = await window.GoldenCodexAPI.verifyProvenance(img.src);

    if (result.verified) {
      addBadge(img, result.method, result);
    }
  } catch (error) {
    console.log('[GCX] Check failed:', error.message);
  }
}

/**
 * Scan page for images
 */
function scanPage() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.complete) {
      checkImage(img);
    } else {
      img.addEventListener('load', () => checkImage(img));
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'verifyImage') {
    // Find image by URL and verify
    const img = document.querySelector('img[src="' + message.imageUrl + '"]');
    if (img) {
      checkImage(img);
    }
  }
});

// Initial scan
if (document.readyState === 'complete') {
  scanPage();
} else {
  window.addEventListener('load', scanPage);
}

// Watch for new images
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'IMG') {
        if (node.complete) {
          checkImage(node);
        } else {
          node.addEventListener('load', () => checkImage(node));
        }
      }
      if (node.querySelectorAll) {
        node.querySelectorAll('img').forEach(img => {
          if (img.complete) {
            checkImage(img);
          } else {
            img.addEventListener('load', () => checkImage(img));
          }
        });
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
