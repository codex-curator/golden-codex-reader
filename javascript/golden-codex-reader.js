/**
 * Golden Codex Reader - JavaScript SDK
 *
 * Extract and decode Golden Codex metadata from images
 *
 * @version 1.0.0
 * @license MIT
 * @see https://github.com/codex-curator/golden-codex-reader
 */

const pako = require('pako');
const crypto = require('crypto');

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

// Browser-compatible exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodePayload,
    calculateSoulmark,
    verifyIntegrity,
    getSummary,
    validate
  };
}

// ES6 exports for modern bundlers
if (typeof exports !== 'undefined') {
  exports.decodePayload = decodePayload;
  exports.calculateSoulmark = calculateSoulmark;
  exports.verifyIntegrity = verifyIntegrity;
  exports.getSummary = getSummary;
  exports.validate = validate;
}
