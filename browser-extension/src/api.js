/**
 * Verilian Reader - Golden Codex Registry API Client
 */

// Use Cloud Run URL until custom domain is configured
const API_BASE = 'https://alex-oracle-172867820131.us-west1.run.app';
const HASH_THRESHOLD = 10;

/**
 * Query registry for matching hashes
 */
async function matchHash(hash, options = {}) {
  const threshold = options.threshold || HASH_THRESHOLD;
  const limit = options.limit || 5;

  const params = new URLSearchParams({
    hash: hash,
    threshold: threshold,
    limit: limit
  });

  const url = API_BASE + '/alex/match?' + params.toString();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('API error: ' + response.status);
    }

    const result = await response.json();

    return {
      success: true,
      matches: result.matches || [],
      query_hash: hash,
      threshold: threshold
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      matches: [],
      query_hash: hash
    };
  }
}

/**
 * Get hash index statistics
 */
async function getHashStats() {
  try {
    const response = await fetch(API_BASE + '/alex/stats');

    if (!response.ok) {
      throw new Error('API error: ' + response.status);
    }

    return await response.json();
  } catch (error) {
    return {
      error: error.message,
      total_artworks: 'unknown'
    };
  }
}

/**
 * Full provenance verification
 */
async function verifyProvenance(imageUrl) {
  const result = {
    verified: false,
    method: null,
    xmp_metadata: null,
    perceptual_hash: null,
    registry_matches: [],
    confidence: 'none'
  };

  try {
    // Step 1: Try to fetch image for XMP extraction
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      if (window.GoldenCodexDecoder) {
        const payload = await window.GoldenCodexDecoder.extractXMPFromBlob(blob);
        if (payload) {
          const metadata = await window.GoldenCodexDecoder.decodeGCUIS(payload);
          result.xmp_metadata = metadata;
          result.method = 'xmp';
          result.verified = true;
          result.confidence = 'high';
          return result;
        }
      }
    } catch (xmpError) {
      console.log('XMP extraction failed, trying hash match');
    }

    // Step 2: Fall back to hash matching
    if (window.GoldenCodexHash) {
      const hash = await window.GoldenCodexHash.hashImageFromUrl(imageUrl);
      result.perceptual_hash = hash;

      const matchResult = await matchHash(hash);

      if (matchResult.success && matchResult.matches.length > 0) {
        result.registry_matches = matchResult.matches;
        result.method = 'hash';
        result.verified = true;

        const bestMatch = matchResult.matches[0];
        if (bestMatch.distance <= 3) {
          result.confidence = 'high';
        } else if (bestMatch.distance <= 7) {
          result.confidence = 'medium';
        } else {
          result.confidence = 'low';
        }
      }
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GoldenCodexAPI = {
    matchHash,
    getHashStats,
    verifyProvenance,
    API_BASE,
    HASH_THRESHOLD
  };
}
