/**
 * Verilian Reader - GCUIS Decoder
 * Decodes Golden Codex Universal Infusion Standard payloads
 */

/**
 * Decode Base64 to Uint8Array
 */
function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, c => c.charCodeAt(0));
}

/**
 * Decompress GZIP data
 */
async function decompressGzip(compressedData) {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(compressedData);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(result);
}

/**
 * Decode GCUIS payload: Base64 -> GZIP -> JSON
 */
async function decodeGCUIS(base64Payload) {
  const compressed = base64ToBytes(base64Payload.trim());
  const jsonString = await decompressGzip(compressed);
  return JSON.parse(jsonString);
}

/**
 * Calculate SHA-256 hash of data
 */
async function calculateSoulmark(data) {
  const jsonString = typeof data === 'object' ? JSON.stringify(data) : data;
  const msgBuffer = new TextEncoder().encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract XMP metadata from image blob
 */
async function extractXMPFromBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  // Search for XMP-gc:CodexPayload
  const payloadMatch = text.match(/gc:CodexPayload="([^"]+)"/);
  if (payloadMatch) {
    return payloadMatch[1];
  }

  // Try alternative format
  const altMatch = text.match(/<gc:CodexPayload>([^<]+)<\/gc:CodexPayload>/);
  if (altMatch) {
    return altMatch[1];
  }

  return null;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GoldenCodexDecoder = {
    decodeGCUIS,
    calculateSoulmark,
    extractXMPFromBlob
  };
}
