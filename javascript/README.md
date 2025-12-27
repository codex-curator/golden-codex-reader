# Golden Codex Reader - JavaScript SDK

Read, verify, and match Golden Codex metadata from digital artworks.

## Installation

```bash
npm install golden-codex-reader
```

For Node.js image processing (perceptual hashing), install optional dependencies:

```bash
npm install sharp  # Recommended for best performance
# OR
npm install jimp   # Pure JavaScript alternative
```

## Quick Start

### Browser Usage

```html
<script src="golden-codex-reader.js"></script>
<script>
  // Verify an image's provenance
  const img = document.getElementById('artwork');

  GoldenCodexReader.verifyProvenance(img).then(result => {
    if (result.verified) {
      console.log('Verified:', result.registry_matches[0].title);
      console.log('Confidence:', result.confidence);
    }
  });
</script>
```

### Node.js Usage

```javascript
const {
  verifyProvenance,
  generatePHash,
  matchHash,
  decodePayload
} = require('golden-codex-reader');
const fs = require('fs');

// Generate perceptual hash
const imageBuffer = fs.readFileSync('artwork.jpg');
const hash = await generatePHash(imageBuffer);
console.log('Perceptual Hash:', hash);

// Query registry for matches
const matches = await matchHash(hash);
if (matches.success && matches.matches.length > 0) {
  console.log('Found:', matches.matches[0].title);
}
```

## API Reference

### v1.0 Metadata Functions

#### `decodePayload(base64Payload)`
Decode a GCUIS (Golden Codex Universal Infusion Standard) payload.

```javascript
const goldenCodex = decodePayload(base64String);
console.log(goldenCodex.title);
```

#### `calculateSoulmark(data)`
Calculate SHA-256 hash of canonical JSON.

```javascript
const hash = calculateSoulmark(goldenCodex);
```

#### `verifyIntegrity(base64Payload, expectedHash)`
Verify payload integrity against expected hash.

```javascript
const result = verifyIntegrity(payload, expectedHash);
if (result.valid) {
  console.log('Integrity verified');
}
```

#### `getSummary(goldenCodex)`
Extract key fields from metadata.

```javascript
const summary = getSummary(goldenCodex);
// { artifactId, title, copyrightHolder, soulWhisperEnabled, ... }
```

#### `validate(goldenCodex)`
Validate against required fields.

```javascript
const { valid, missingFields, warnings } = validate(goldenCodex);
```

### v2.0 Hash Matching Functions

#### `generatePHash(image, options?)`
Generate perceptual hash from image. Works in browser (HTMLImageElement, ImageData) and Node.js (Buffer).

```javascript
// Browser
const hash = await generatePHash(imgElement);

// Node.js
const hash = await generatePHash(imageBuffer);
```

Options:
- `size`: Hash grid size (default: 16)

#### `hammingDistance(hash1, hash2)`
Calculate bit difference between two hashes.

```javascript
const distance = hammingDistance(hash1, hash2);
// 0 = identical, higher = more different
```

#### `hashesMatch(hash1, hash2, threshold?)`
Check if hashes match within threshold.

```javascript
if (hashesMatch(hash1, hash2, 10)) {
  console.log('Images are similar');
}
```

#### `matchHash(pHash, options?)`
Query Golden Codex registry for matching artworks.

```javascript
const result = await matchHash(hash, {
  apiBase: 'https://alex-oracle.goldencodex.art',
  threshold: 10,
  limit: 5
});

if (result.success) {
  result.matches.forEach(match => {
    console.log(`${match.title} (distance: ${match.distance})`);
  });
}
```

#### `verifyProvenance(image, options?)`
Full provenance verification workflow.

```javascript
const result = await verifyProvenance(image);
// {
//   verified: true,
//   perceptual_hash: 'a1b2c3...',
//   registry_matches: [...],
//   confidence: 'high' | 'medium' | 'low' | 'none'
// }
```

#### `compareImages(image1, image2, options?)`
Compare two images by perceptual hash.

```javascript
const result = await compareImages(img1, img2);
// {
//   match: true,
//   distance: 3,
//   similarity: 95,
//   hash1: '...',
//   hash2: '...'
// }
```

## Constants

```javascript
const { HASH_SIZE, HASH_THRESHOLD, DEFAULT_REGISTRY_API } = require('golden-codex-reader');

HASH_SIZE          // 16 (16x16 grid = 256 bits)
HASH_THRESHOLD     // 10 (max hamming distance for match)
DEFAULT_REGISTRY_API // 'https://alex-oracle.goldencodex.art'
```

## TypeScript

Full TypeScript definitions included:

```typescript
import {
  verifyProvenance,
  GoldenCodex,
  ProvenanceResult
} from 'golden-codex-reader';
```

## Browser Extension

This SDK powers the Verilian Reader browser extension. See the `extensions/` folder for Chrome and Firefox implementations.

## License

MIT - Metavolve Labs, Inc.
