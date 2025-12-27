/**
 * Verilian Reader - Popup Script
 */

// State elements
const initialState = document.getElementById('initial-state');
const loadingState = document.getElementById('loading-state');
const verifiedXmpState = document.getElementById('verified-xmp-state');
const verifiedHashState = document.getElementById('verified-hash-state');
const notFoundState = document.getElementById('not-found-state');
const loadingText = document.getElementById('loading-text');
const dropZone = document.getElementById('drop-zone');
const registryCount = document.getElementById('registry-count');

/**
 * Show specific state, hide others
 */
function showState(stateName) {
  const states = ['initial', 'loading', 'verified-xmp', 'verified-hash', 'not-found'];
  states.forEach(s => {
    const el = document.getElementById(s + '-state');
    if (el) {
      el.classList.toggle('hidden', s !== stateName);
    }
  });
}

/**
 * Display XMP metadata
 */
function displayXmpMetadata(metadata) {
  showState('verified-xmp');

  document.getElementById('xmp-title').textContent = metadata.title || 'Untitled';
  document.getElementById('xmp-artist').textContent =
    metadata.creation_credits?.artist || 'Unknown Artist';
  document.getElementById('xmp-id').textContent =
    metadata._identifiers?.artifactId || metadata.artifactId || '-';
  document.getElementById('xmp-copyright').textContent =
    metadata.ownership_and_rights?.copyright?.holder || '-';
  document.getElementById('xmp-schema').textContent =
    metadata.schemaVersion || '-';

  // SoulWhisper
  const soulwhisperEl = document.getElementById('xmp-soulwhisper');
  if (metadata.soulWhisper?.enabled && metadata.soulWhisper?.message) {
    soulwhisperEl.classList.remove('hidden');
    document.getElementById('xmp-soulwhisper-msg').textContent =
      '"' + metadata.soulWhisper.message + '"';
  } else {
    soulwhisperEl.classList.add('hidden');
  }
}

/**
 * Display hash match results
 */
function displayHashMatch(result) {
  showState('verified-hash');

  const match = result.registry_matches[0];
  const confidence = result.confidence;

  // Confidence circle
  const confidenceEl = document.getElementById('hash-confidence');
  confidenceEl.classList.remove('high', 'medium', 'low');
  confidenceEl.classList.add(confidence);

  if (confidence === 'high') {
    confidenceEl.textContent = '98%';
  } else if (confidence === 'medium') {
    confidenceEl.textContent = '85%';
  } else {
    confidenceEl.textContent = '70%';
  }

  document.getElementById('hash-title').textContent = match.title || 'Untitled';
  document.getElementById('hash-artist').textContent = match.artist || 'Unknown';
  document.getElementById('hash-id').textContent = match.artifactId || '-';
  document.getElementById('hash-distance').textContent = match.distance + ' bits';
}

/**
 * Verify an image URL
 */
async function verifyImage(imageUrl) {
  showState('loading');
  loadingText.textContent = 'Extracting metadata...';

  try {
    // Try XMP extraction first
    loadingText.textContent = 'Checking embedded metadata...';

    const response = await fetch(imageUrl);
    const blob = await response.blob();

    if (window.GoldenCodexDecoder) {
      const payload = await window.GoldenCodexDecoder.extractXMPFromBlob(blob);
      if (payload) {
        loadingText.textContent = 'Decoding Golden Codex...';
        const metadata = await window.GoldenCodexDecoder.decodeGCUIS(payload);
        displayXmpMetadata(metadata);
        return;
      }
    }

    // Fall back to hash matching
    loadingText.textContent = 'Computing perceptual hash...';

    if (window.GoldenCodexHash) {
      const hash = await window.GoldenCodexHash.hashImageFromUrl(imageUrl);

      loadingText.textContent = 'Querying registry...';

      if (window.GoldenCodexAPI) {
        const matchResult = await window.GoldenCodexAPI.matchHash(hash);

        if (matchResult.success && matchResult.matches.length > 0) {
          displayHashMatch({
            registry_matches: matchResult.matches,
            confidence: matchResult.matches[0].distance <= 3 ? 'high' :
                        matchResult.matches[0].distance <= 7 ? 'medium' : 'low'
          });
          return;
        }
      }
    }

    // Not found
    showState('not-found');

  } catch (error) {
    console.error('Verification failed:', error);
    showState('not-found');
  }
}

/**
 * Handle dropped files
 */
function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('active');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    verifyImage(url);
  }
}

// Drop zone events
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', handleDrop);

// Check for pending verification from context menu
chrome.storage.local.get('pendingVerification', (result) => {
  if (result.pendingVerification) {
    verifyImage(result.pendingVerification.imageUrl);
    chrome.storage.local.remove('pendingVerification');
  }
});

// Fetch registry stats
async function fetchStats() {
  if (window.GoldenCodexAPI) {
    const stats = await window.GoldenCodexAPI.getHashStats();
    if (stats.total_artworks) {
      registryCount.textContent = stats.total_artworks.toLocaleString();
    }
  }
}

fetchStats();
