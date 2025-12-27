/**
 * Verilian Reader - Perceptual Hash Generator
 * Generates perceptual hashes for image matching
 */

const HASH_SIZE = 16; // 16x16 grid = 256 bits

/**
 * Generate perceptual hash from an image element
 * Uses average hash algorithm
 */
async function generatePHash(img) {
  // Create canvas for image processing
  const canvas = document.createElement('canvas');
  canvas.width = HASH_SIZE;
  canvas.height = HASH_SIZE;
  const ctx = canvas.getContext('2d');

  // Draw image scaled to hash size
  ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);
  const imageData = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
  const pixels = imageData.data;

  // Convert to grayscale
  const grayscale = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    grayscale.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
  }

  // Calculate average
  const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;

  // Build hash: 1 if pixel >= avg, 0 otherwise
  let binaryHash = '';
  for (let i = 0; i < grayscale.length; i++) {
    binaryHash += grayscale[i] >= avg ? '1' : '0';
  }

  // Convert binary to hex
  let hexHash = '';
  for (let i = 0; i < binaryHash.length; i += 4) {
    hexHash += parseInt(binaryHash.substr(i, 4), 2).toString(16);
  }

  return hexHash;
}

/**
 * Calculate hamming distance between two hashes
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
    distance += xor.toString(2).split('1').length - 1;
  }
  return distance;
}

/**
 * Load image from URL and generate hash
 */
async function hashImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const hash = await generatePHash(img);
        resolve(hash);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GoldenCodexHash = {
    generatePHash,
    hammingDistance,
    hashImageFromUrl,
    HASH_SIZE
  };
}
