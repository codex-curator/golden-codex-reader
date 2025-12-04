/**
 * Golden Codex Reader - Popup Script
 * Copyright (c) 2025 Metavolve Labs, Inc.
 */

document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const pasteArea = document.getElementById('pasteArea');
  const decodeBtn = document.getElementById('decodeBtn');
  const statusMessage = document.getElementById('statusMessage');
  const inputSection = document.getElementById('inputSection');
  const resultsSection = document.getElementById('resultsSection');
  const loadingSection = document.getElementById('loadingSection');
  const metadataDisplay = document.getElementById('metadataDisplay');
  const backBtn = document.getElementById('backBtn');

  let currentPayload = null;

  // File upload handling
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      showStatus('Please drop an image file', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  });

  // Decode button
  decodeBtn.addEventListener('click', async () => {
    const payload = pasteArea.value.trim();
    if (payload) {
      await decodePayload(payload);
    } else {
      showStatus('Please paste a Base64 payload or upload an image', 'error');
    }
  });

  // Back button
  backBtn.addEventListener('click', () => {
    resultsSection.classList.remove('active');
    inputSection.style.display = 'block';
    statusMessage.innerHTML = '';
    pasteArea.value = '';
  });

  // Process image file - try to extract metadata
  async function processImageFile(file) {
    showLoading(true);
    showStatus('Analyzing image...', 'info');

    try {
      // Read file as ArrayBuffer to extract EXIF/XMP
      const arrayBuffer = await file.arrayBuffer();
      const payload = await extractPayloadFromImage(arrayBuffer, file.type);

      if (payload) {
        await decodePayload(payload);
      } else {
        showLoading(false);
        showNoMetadata();
      }
    } catch (error) {
      showLoading(false);
      showStatus(`Error processing image: ${error.message}`, 'error');
    }
  }

  // Extract Golden Codex payload from image
  async function extractPayloadFromImage(arrayBuffer, mimeType) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const dataString = uint8ArrayToString(uint8Array);

    // Look for XMP packet
    const xmpStart = dataString.indexOf('<x:xmpmeta');
    const xmpEnd = dataString.indexOf('</x:xmpmeta>');

    if (xmpStart !== -1 && xmpEnd !== -1) {
      const xmpData = dataString.substring(xmpStart, xmpEnd + 12);

      // Look for CodexPayload in XMP
      const payloadMatch = xmpData.match(/gc:CodexPayload[^>]*>([^<]+)</);
      if (payloadMatch) {
        return payloadMatch[1].trim();
      }

      // Alternative: Look for base64 encoded data
      const base64Match = xmpData.match(/CodexPayload="([^"]+)"/);
      if (base64Match) {
        return base64Match[1].trim();
      }
    }

    // PNG: Look in tEXt/iTXt chunks
    if (mimeType === 'image/png') {
      const payload = extractFromPNG(uint8Array);
      if (payload) return payload;
    }

    return null;
  }

  // Extract from PNG chunks
  function extractFromPNG(uint8Array) {
    // PNG signature: 137 80 78 71 13 10 26 10
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    const isPNG = pngSignature.every((byte, i) => uint8Array[i] === byte);
    if (!isPNG) return null;

    let offset = 8; // Skip signature
    const decoder = new TextDecoder('utf-8');

    while (offset < uint8Array.length) {
      // Read chunk length (4 bytes, big-endian)
      const length = (uint8Array[offset] << 24) |
                     (uint8Array[offset + 1] << 16) |
                     (uint8Array[offset + 2] << 8) |
                     uint8Array[offset + 3];

      // Read chunk type (4 bytes)
      const type = decoder.decode(uint8Array.slice(offset + 4, offset + 8));

      if (type === 'tEXt' || type === 'iTXt') {
        const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
        const chunkString = decoder.decode(chunkData);

        if (chunkString.includes('CodexPayload') || chunkString.includes('gc:')) {
          // Extract the payload value
          const parts = chunkString.split('\0');
          if (parts.length >= 2) {
            return parts[parts.length - 1].trim();
          }
        }
      }

      // Move to next chunk (length + type + data + CRC)
      offset += 12 + length;

      // Safety check
      if (offset > uint8Array.length + 1000) break;
    }

    return null;
  }

  // Decode payload and show results
  async function decodePayload(payload) {
    showLoading(true);

    try {
      const result = await GoldenCodexDecoder.decodePayload(payload);

      showLoading(false);

      if (result.success) {
        const html = GoldenCodexDecoder.formatForDisplay(result.data);
        metadataDisplay.innerHTML = html;
        inputSection.style.display = 'none';
        resultsSection.classList.add('active');
      } else {
        showStatus(`Decode failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showLoading(false);
      showStatus(`Error: ${error.message}`, 'error');
    }
  }

  // Show no metadata found
  function showNoMetadata() {
    metadataDisplay.innerHTML = `
      <div class="no-metadata">
        <div class="no-metadata-icon">🔍</div>
        <h3>No Golden Codex Found</h3>
        <p>This image doesn't contain Golden Codex metadata.</p>
        <p style="margin-top: 12px; font-size: 12px;">
          <a href="https://goldencodex.art" target="_blank" style="color: #c9a227;">
            Learn how to add Golden Codex to your artworks →
          </a>
        </p>
      </div>
    `;
    inputSection.style.display = 'none';
    resultsSection.classList.add('active');
  }

  // Helper functions
  function showStatus(message, type) {
    statusMessage.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  function showLoading(show) {
    loadingSection.style.display = show ? 'block' : 'none';
    if (show) {
      inputSection.style.display = 'none';
      resultsSection.classList.remove('active');
    }
  }

  function uint8ArrayToString(uint8Array) {
    // Handle large arrays in chunks to avoid stack overflow
    const chunkSize = 8192;
    let result = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      result += String.fromCharCode.apply(null, chunk);
    }
    return result;
  }

  // Check for image passed from context menu
  chrome.storage.local.get(['pendingImage'], async (result) => {
    if (result.pendingImage) {
      showStatus('Processing image from context menu...', 'info');

      try {
        const response = await fetch(result.pendingImage);
        const blob = await response.blob();
        const file = new File([blob], 'image', { type: blob.type });
        await processImageFile(file);
      } catch (error) {
        showStatus(`Error loading image: ${error.message}`, 'error');
      }

      // Clear the pending image
      chrome.storage.local.remove('pendingImage');
    }
  });
});
