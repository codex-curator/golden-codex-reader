/**
 * Golden Codex Reader - Content Script
 * Adds Golden Codex detection to web pages
 * Copyright (c) 2025 Metavolve Labs, Inc.
 */

(function() {
  'use strict';

  // Add Golden Codex indicator badge to images
  function addGoldenCodexBadge(img, hasMetadata) {
    if (img.dataset.gcChecked) return;
    img.dataset.gcChecked = 'true';

    // Only add badge to reasonably sized images
    if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
    `;

    const badge = document.createElement('div');
    badge.className = 'gc-badge';
    badge.innerHTML = hasMetadata ? '📜' : '';
    badge.title = hasMetadata
      ? 'This image contains Golden Codex metadata. Click to view.'
      : 'No Golden Codex metadata found';
    badge.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      background: ${hasMetadata ? 'linear-gradient(135deg, #7b2d8e, #c9a227)' : '#333'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    if (hasMetadata) {
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({
          action: 'decodeImage',
          imageUrl: img.src
        });
      });
    }

    // Show badge on hover
    const showBadge = () => { badge.style.opacity = '1'; };
    const hideBadge = () => { badge.style.opacity = '0'; };

    img.parentElement.style.position = 'relative';
    img.parentElement.appendChild(badge);

    img.addEventListener('mouseenter', showBadge);
    img.addEventListener('mouseleave', hideBadge);
    badge.addEventListener('mouseenter', showBadge);
    badge.addEventListener('mouseleave', hideBadge);
  }

  // Check if image has Golden Codex metadata
  async function checkImageForGoldenCodex(img) {
    // Skip data URLs and tiny images
    if (img.src.startsWith('data:') || img.naturalWidth < 50) return;

    try {
      // For same-origin images, we can read the data
      const response = await fetch(img.src);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const dataString = String.fromCharCode.apply(null, uint8Array.slice(0, 10000));

      // Look for Golden Codex markers
      const hasGC = dataString.includes('gc:CodexPayload') ||
                    dataString.includes('GoldenCodex') ||
                    dataString.includes('goldencodex');

      if (hasGC) {
        addGoldenCodexBadge(img, true);
      }
    } catch (error) {
      // Cross-origin image - can't check, but still allow right-click
      // The popup will handle the actual extraction
    }
  }

  // Scan page for images
  function scanImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete) {
        checkImageForGoldenCodex(img);
      } else {
        img.addEventListener('load', () => checkImageForGoldenCodex(img));
      }
    });
  }

  // Watch for new images added to the page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'IMG') {
          if (node.complete) {
            checkImageForGoldenCodex(node);
          } else {
            node.addEventListener('load', () => checkImageForGoldenCodex(node));
          }
        }
        // Check for images inside added nodes
        if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(img => {
            if (img.complete) {
              checkImageForGoldenCodex(img);
            } else {
              img.addEventListener('load', () => checkImageForGoldenCodex(img));
            }
          });
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanImages);
  } else {
    scanImages();
  }

  console.log('Golden Codex Reader: Content script loaded');
})();
