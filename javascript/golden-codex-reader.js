/**
 * Golden Codex Reader - JavaScript SDK
 *
 * Extract, decode, and verify Golden Codex metadata from images.
 * Supports perceptual hash matching for provenance verification.
 *
 * @version 2.0.0
 * @license MIT
 * @see https://github.com/codex-curator/golden-codex-reader
 */

const pako = require('pako');
const crypto = require('crypto');

// Default API endpoint for hash matching
const DEFAULT_REGISTRY_API = 'https://alex-oracle-172867820131.us-west1.run.app';

// Perceptual hash configuration
const HASH_SIZE = 16; // 16x16 = 256 bits
const HASH_THRESHOLD = 10; // Maximum hamming distance for match

/**
 * Decode a GCUIS (Golden Codex Universal Infusion Standard) payload
 * Pipeline: Base64 → GZIP decompress → JSON parse
 *
 * @param {string} base64Payload - Base64 encoded GCUIS payload
 * @returns {Object} Decoded Golden Codex metadata object
 */
function decodePayload(base64Payload) {
  // Step 1: Base64 decode
  const compressedData = Buffer.from(base64Payload.trim(), 'base64');

  // Step 2: GZIP decompress
  const jsonString = pako.ungzip(compressedData, { to: 'string' });

  // Step 3: JSON parse
  const goldenCodex = JSON.parse(jsonString);

  return goldenCodex;
}

/**
 * Calculate the Soulmark hash (SHA-256 of canonical JSON)
 *
 * @param {Object|string} data - Golden Codex object or JSON string
 * @returns {string} SHA-256 hash hex string
 */
function calculateSoulmark(data) {
  let jsonString;
  if (typeof data === 'object') {
    // Canonical JSON: sorted keys, no whitespace
    jsonString = JSON.stringify(data);
  } else {
    jsonString = data;
  }

  return crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
}

/**
 * Verify the integrity of a Golden Codex payload
 *
 * @param {string} base64Payload - Encoded payload
 * @param {string} expectedHash - Expected Soulmark hash
 * @returns {Object} { valid: boolean, data: Object|null, calculatedHash: string }
 */
function verifyIntegrity(base64Payload, expectedHash) {
  try {
    const data = decodePayload(base64Payload);
    const calculatedHash = calculateSoulmark(data);

    return {
      valid: calculatedHash === expectedHash,
      data,
      calculatedHash,
      expectedHash
    };
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: error.message
    };
  }
}

/**
 * Extract a summary of key fields from Golden Codex metadata
 *
 * @param {Object} goldenCodex - Decoded metadata object
 * @returns {Object} Summary with key fields
 */
function getSummary(goldenCodex) {
  return {
    schemaVersion: goldenCodex.schemaVersion || 'N/A',
    artifactId: goldenCodex._identifiers?.artifactId || goldenCodex.artifactId || 'N/A',
    title: goldenCodex.title || 'N/A',
    description: goldenCodex.description || 'N/A',
    copyrightHolder: goldenCodex.ownership_and_rights?.copyright?.holder || 'N/A',
    soulWhisperEnabled: goldenCodex.soulWhisper?.enabled || false,
    soulWhisperMessage: goldenCodex.soulWhisper?.message || null,
    primaryEmotion: goldenCodex.emotional_and_thematic_journey?.primary_emotion || 'N/A',
    keywords: goldenCodex.contextual_graph?.keywords || [],
    institution: goldenCodex.archival?.institution || 'N/A'
  };
}

/**
 * Validate Golden Codex metadata against required fields
 *
 * @param {Object} goldenCodex - Metadata object
 * @returns {Object} { valid: boolean, missingFields: string[], warnings: string[] }
 */
function validate(goldenCodex) {
  const requiredFields = [
    '_identifiers.artifactId',
    'title',
    'ownership_and_rights.copyright.holder'
  ];

  const missingFields = [];
  const warnings = [];

  // Check _identifiers.artifactId
  if (!goldenCodex._identifiers?.artifactId && !goldenCodex.artifactId) {
    missingFields.push('_identifiers.artifactId');
  }

  // Check title
  if (!goldenCodex.title) {
    missingFields.push('title');
  }

  // Check copyright holder
  if (!goldenCodex.ownership_and_rights?.copyright?.holder) {
    missingFields.push('ownership_and_rights.copyright.holder');
  }

  // Schema version check
  if (!goldenCodex.schemaVersion) {
    warnings.push('Missing schemaVersion - unable to verify compatibility');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

// ============================================
// PERCEPTUAL HASH MATCHING (v2.0)
// ============================================

/**
 * Generate a perceptual hash from an image
 * Uses average hash algorithm - works in both Node.js and browser
 *
 * @param {HTMLImageElement|ImageData|Buffer} image - Image to hash
 * @param {Object} options - Hash options
 * @param {number} options.size - Hash grid size (default: 16)
 * @returns {Promise<string>} Hex string perceptual hash
 */
async function generatePHash(image, options = {}) {
  const size = options.size || HASH_SIZE;

  // Handle different input types
  let imageData;

  if (typeof window !== 'undefined' && image instanceof HTMLImageElement) {
    // Browser: HTMLImageElement
    imageData = await imageToGrayscale(image, size);
  } else if (image instanceof ImageData) {
    // Browser: ImageData object
    imageData = await imageDataToGrayscale(image, size);
  } else if (Buffer.isBuffer(image)) {
    // Node.js: Buffer - requires sharp or jimp
    imageData = await bufferToGrayscale(image, size);
  } else {
    throw new Error('Unsupported image type. Expected HTMLImageElement, ImageData, or Buffer.');
  }

  // Compute average hash
  const hash = computeAverageHash(imageData, size);
  return hash;
}

/**
 * Convert HTMLImageElement to grayscale pixel array
 * @private
 */
async function imageToGrayscale(img, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw image scaled to hash size
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);

  return rgbaToGrayscale(imageData.data, size);
}

/**
 * Convert ImageData to grayscale pixel array
 * @private
 */
async function imageDataToGrayscale(imageData, size) {
  // If already correct size, convert directly
  if (imageData.width === size && imageData.height === size) {
    return rgbaToGrayscale(imageData.data, size);
  }

  // Need to resize - create canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Create temp canvas with original size
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);

  // Draw scaled
  ctx.drawImage(tempCanvas, 0, 0, size, size);
  const scaledData = ctx.getImageData(0, 0, size, size);

  return rgbaToGrayscale(scaledData.data, size);
}

/**
 * Convert Buffer to grayscale using sharp (Node.js)
 * Falls back to jimp if sharp not available
 * @private
 */
async function bufferToGrayscale(buffer, size) {
  try {
    // Try sharp first (faster)
    const sharp = require('sharp');
    const { data } = await sharp(buffer)
      .resize(size, size, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Array.from(data);
  } catch (e) {
    try {
      // Fall back to jimp
      const Jimp = require('jimp');
      const img = await Jimp.read(buffer);
      img.resize(size, size).grayscale();

      const pixels = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const { r } = Jimp.intToRGBA(img.getPixelColor(x, y));
          pixels.push(r);
        }
      }
      return pixels;
    } catch (e2) {
      throw new Error('Neither sharp nor jimp available for Node.js image processing');
    }
  }
}

/**
 * Convert RGBA array to grayscale values
 * @private
 */
function rgbaToGrayscale(rgba, size) {
  const grayscale = [];
  for (let i = 0; i < size * size; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // Luminosity formula
    grayscale.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
  }
  return grayscale;
}

/**
 * Compute average hash from grayscale pixels
 * @private
 */
function computeAverageHash(pixels, size) {
  // Calculate average
  const sum = pixels.reduce((a, b) => a + b, 0);
  const avg = sum / pixels.length;

  // Build hash: 1 if pixel >= avg, 0 otherwise
  let hash = '';
  for (let i = 0; i < pixels.length; i++) {
    hash += pixels[i] >= avg ? '1' : '0';
  }

  // Convert binary to hex
  let hex = '';
  for (let i = 0; i < hash.length; i += 4) {
    hex += parseInt(hash.substr(i, 4), 2).toString(16);
  }

  return hex;
}

/**
 * Calculate hamming distance between two hashes
 *
 * @param {string} hash1 - First hex hash
 * @param {string} hash2 - Second hex hash
 * @returns {number} Number of differing bits
 */
function hammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be same length');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    const xor = n1 ^ n2;
    // Count set bits
    distance += xor.toString(2).split('1').length - 1;
  }
  return distance;
}

/**
 * Check if two hashes match within threshold
 *
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @param {number} threshold - Maximum allowed hamming distance (default: 10)
 * @returns {boolean} True if hashes match
 */
function hashesMatch(hash1, hash2, threshold = HASH_THRESHOLD) {
  const distance = hammingDistance(hash1, hash2);
  return distance <= threshold;
}

/**
 * Query the Golden Codex registry for matching hashes
 *
 * @param {string} pHash - Perceptual hash to search for
 * @param {Object} options - Query options
 * @param {string} options.apiBase - Registry API base URL
 * @param {number} options.threshold - Match threshold (default: 10)
 * @param {number} options.limit - Maximum results (default: 5)
 * @returns {Promise<Object>} Match results
 */
async function matchHash(pHash, options = {}) {
  const apiBase = options.apiBase || DEFAULT_REGISTRY_API;
  const threshold = options.threshold || HASH_THRESHOLD;
  const limit = options.limit || 5;

  const url = `${apiBase}/alex/match?hash=${encodeURIComponent(pHash)}&threshold=${threshold}&limit=${limit}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Registry API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      matches: result.matches || [],
      query_hash: pHash,
      threshold: threshold
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      matches: [],
      query_hash: pHash
    };
  }
}

/**
 * Verify provenance of an image by:
 * 1. Extracting embedded metadata (if present)
 * 2. Computing perceptual hash
 * 3. Querying registry for matches
 *
 * @param {HTMLImageElement|Buffer} image - Image to verify
 * @param {Object} options - Verification options
 * @param {string} options.apiBase - Registry API URL
 * @param {number} options.threshold - Hash match threshold
 * @returns {Promise<Object>} Verification result
 */
async function verifyProvenance(image, options = {}) {
  const result = {
    verified: false,
    embedded_metadata: null,
    perceptual_hash: null,
    registry_matches: [],
    confidence: 'none'
  };

  try {
    // Step 1: Generate perceptual hash
    result.perceptual_hash = await generatePHash(image);

    // Step 2: Query registry for matches
    const matchResult = await matchHash(result.perceptual_hash, options);

    if (matchResult.success && matchResult.matches.length > 0) {
      result.registry_matches = matchResult.matches;
      result.verified = true;

      // Determine confidence based on match quality
      const bestMatch = matchResult.matches[0];
      if (bestMatch.distance <= 3) {
        result.confidence = 'high';
      } else if (bestMatch.distance <= 7) {
        result.confidence = 'medium';
      } else {
        result.confidence = 'low';
      }
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Compare two images by perceptual hash
 *
 * @param {HTMLImageElement|Buffer} image1 - First image
 * @param {HTMLImageElement|Buffer} image2 - Second image
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} Comparison result
 */
async function compareImages(image1, image2, options = {}) {
  const threshold = options.threshold || HASH_THRESHOLD;

  const hash1 = await generatePHash(image1, options);
  const hash2 = await generatePHash(image2, options);
  const distance = hammingDistance(hash1, hash2);

  return {
    match: distance <= threshold,
    distance: distance,
    threshold: threshold,
    similarity: Math.round((1 - distance / (HASH_SIZE * HASH_SIZE / 4)) * 100),
    hash1: hash1,
    hash2: hash2
  };
}

// Browser-compatible exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // v1.0 Metadata functions
    decodePayload,
    calculateSoulmark,
    verifyIntegrity,
    getSummary,
    validate,
    // v2.0 Hash matching functions
    generatePHash,
    hammingDistance,
    hashesMatch,
    matchHash,
    verifyProvenance,
    compareImages,
    // Constants
    HASH_SIZE,
    HASH_THRESHOLD,
    DEFAULT_REGISTRY_API
  };
}

// ES6 exports for modern bundlers
if (typeof exports !== 'undefined') {
  // v1.0 Metadata functions
  exports.decodePayload = decodePayload;
  exports.calculateSoulmark = calculateSoulmark;
  exports.verifyIntegrity = verifyIntegrity;
  exports.getSummary = getSummary;
  exports.validate = validate;
  // v2.0 Hash matching functions
  exports.generatePHash = generatePHash;
  exports.hammingDistance = hammingDistance;
  exports.hashesMatch = hashesMatch;
  exports.matchHash = matchHash;
  exports.verifyProvenance = verifyProvenance;
  exports.compareImages = compareImages;
  // Constants
  exports.HASH_SIZE = HASH_SIZE;
  exports.HASH_THRESHOLD = HASH_THRESHOLD;
  exports.DEFAULT_REGISTRY_API = DEFAULT_REGISTRY_API;
}
