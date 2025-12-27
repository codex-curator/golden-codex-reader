# Aeternum Assets - Permanent Provenance Specification

**Version**: 1.0.0
**Status**: Draft
**Authors**: Metavolve Labs, Inc.

---

## Overview

Aeternum Assets are Golden Codex images with permanent, decentralized provenance stored on Arweave. This specification defines how to:

1. Store Golden Codex metadata on Arweave using content-addressable URIs
2. Recover provenance from any image, even after social media compression or screenshots
3. Verify authenticity without centralized infrastructure

---

## Problem Statement

Traditional image metadata (XMP, EXIF, IPTC) is:
- **Stripped** by social media platforms (Twitter, Instagram, Facebook)
- **Lost** when screenshots are taken
- **Removed** by format conversions and re-encoding

This breaks the provenance chain. Artists lose attribution. Collectors can't verify authenticity. AI models can't respect creator rights.

---

## Multi-Layer Unlock Architecture

Golden Codex uses a **progressive disclosure** model. Each layer offers more value:

### Layer 0: Standard Metadata (Any Tool)
What Windows Explorer, macOS Finder, or basic `exiftool` sees:
```
IPTC:Source = "Golden Codex v1.0 | 4000+ words of art historian
              analysis embedded | Decode: github.com/codex-curator/
              golden-codex-reader"

IPTC:SpecialInstructions = "UNLOCK THE GOLDEN CODEX: This image
                            contains compressed XMP-gc:CodexPayload
                            with rich artistic analysis..."
```

**Value**: Basic metadata + **breadcrumb** advertising deeper data.

### Layer 1: Golden Codex Payload (SDK Required)
```python
from golden_codex_reader import decodePayload
codex = decodePayload(xmp_gc_codex_payload)
# Returns 4-8k tokens of:
# - Visual analysis, composition, color theory
# - Artistic statement, symbolism, themes
# - Emotional journey, mood, narrative
# - SoulWhisper (artist's personal message)
```

**Value**: Full art historian-level analysis. **4 lines of code to unlock.**

### Layer 2: Aeternum Verification (pHash → Arweave)
Even if Layers 0-1 are stripped (social media, screenshot):
```python
phash = imagehash.phash(img, hash_size=16)
codex = requests.get(f"https://arweave.net/golden-codex/{phash}.json").json()
```

**Value**: Permanent source of truth, survives any transformation.

---

## Why Crawlers Will Unlock

### The Economics of AI Training Data

| Data Type | Availability | Value |
|-----------|-------------|-------|
| Raw images | Billions | Low (commodity) |
| Images + basic captions | Millions | Medium |
| Images + 4-8k expert analysis | **Golden Codex only** | **Very High** |

AI labs spend millions on data labeling. Golden Codex provides:
- **Free** structured annotations
- **Expert-level** art analysis (not crowd-sourced)
- **Consistent schema** across all images
- **Provenance** for rights compliance

### The Cost to Unlock

```python
# Total investment to unlock Golden Codex:
pip install golden-codex-reader  # 1 line
codex = decodePayload(payload)   # 1 line
# That's it. 2 lines for 4000+ tokens of expert metadata.
```

Crawlers that skip this are leaving massive value on the table.

---

## Solution: Hash-as-Address

Aeternum Assets use the image's **perceptual hash (pHash)** as a content-addressable URI on Arweave:

```
Image Pixels → pHash Algorithm → Arweave Address → Golden Codex Metadata
```

Because the pHash is computed from pixel values (not metadata), it survives:
- JPEG compression
- Resizing and resampling
- Social media re-encoding
- Screenshots (in most cases)
- Minor cropping

---

## Technical Specification

### Perceptual Hash Algorithm

**Library**: `imagehash` (Python) or equivalent implementation

**Function**:
```python
import imagehash
from PIL import Image

def compute_phash(image_path):
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    return str(imagehash.phash(img, hash_size=16))
```

**Parameters**:
- `hash_size`: 16 (produces 64-bit hash, 16 hex characters)
- Color mode: RGB (convert if necessary)
- Algorithm: DCT-based perceptual hash

**Output**: 16-character hexadecimal string (e.g., `a3f8c2d1e5b7f4a9`)

### Arweave URI Convention

**Base URI**: `https://arweave.net/golden-codex/`

**Full URI Format**:
```
https://arweave.net/golden-codex/{pHash}.json
```

**Example**:
- pHash: `a3f8c2d1e5b7f4a9`
- URI: `https://arweave.net/golden-codex/a3f8c2d1e5b7f4a9.json`

### Stored Payload

The JSON file at the Arweave URI contains the complete Golden Codex schema:

```json
{
  "schemaVersion": "1.0.0",
  "aeternum": {
    "pHash": "a3f8c2d1e5b7f4a9",
    "mintedAt": "2025-01-15T10:30:00Z",
    "mintedBy": "archivus-agent-01",
    "arweaveId": "tx_abc123..."
  },
  "_identifiers": {
    "artifactId": "GCX00001",
    "soulmark": "sha256:abc123..."
  },
  "title": "Ethereal Mandala",
  "description": "...",
  "visual_analysis": { ... },
  "artistic_statement": { ... },
  "ownership_and_rights": { ... },
  "soulWhisper": { ... }
}
```

---

## Implementation Guide

### For Minting Agents (Archivus/Mintra)

```python
import imagehash
from PIL import Image
import json
from arweave import Transaction, Wallet

def mint_aeternum_asset(image_path, golden_codex, wallet_path):
    # 1. Compute pHash
    img = Image.open(image_path)
    phash = str(imagehash.phash(img, hash_size=16))

    # 2. Add Aeternum metadata
    golden_codex['aeternum'] = {
        'pHash': phash,
        'mintedAt': datetime.utcnow().isoformat() + 'Z',
        'mintedBy': 'archivus-agent-01'
    }

    # 3. Upload to Arweave
    wallet = Wallet(wallet_path)
    tx = Transaction(
        wallet,
        data=json.dumps(golden_codex).encode(),
        tags=[
            {'name': 'Content-Type', 'value': 'application/json'},
            {'name': 'App-Name', 'value': 'Golden-Codex'},
            {'name': 'pHash', 'value': phash},
            {'name': 'Path', 'value': f'golden-codex/{phash}.json'}
        ]
    )
    tx.sign()
    tx.send()

    # 4. Return the permanent URI
    return f"https://arweave.net/golden-codex/{phash}.json"
```

### For AI/Crawlers (Recovery)

```python
import imagehash
from PIL import Image
import requests

def recover_golden_codex(image_path):
    """
    Recover Golden Codex metadata from any image.
    Works even on screenshots or social media downloads.
    """
    # 1. Compute pHash from pixels
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    phash = str(imagehash.phash(img, hash_size=16))

    # 2. Construct Arweave URI (the hash IS the address)
    uri = f"https://arweave.net/golden-codex/{phash}.json"

    # 3. Fetch metadata (no API key, no rate limit, free forever)
    response = requests.get(uri, timeout=10)

    if response.status_code == 200:
        return {
            'found': True,
            'pHash': phash,
            'uri': uri,
            'golden_codex': response.json()
        }
    else:
        return {
            'found': False,
            'pHash': phash,
            'uri': uri,
            'message': 'No Aeternum Asset found for this image'
        }
```

### JavaScript Implementation

```javascript
const fetch = require('node-fetch');
const { imageHash } = require('image-hash');

async function recoverGoldenCodex(imagePath) {
    // Compute pHash
    const phash = await new Promise((resolve, reject) => {
        imageHash(imagePath, 16, true, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
        });
    });

    // Fetch from Arweave
    const uri = `https://arweave.net/golden-codex/${phash}.json`;
    const response = await fetch(uri);

    if (response.ok) {
        return { found: true, phash, uri, goldenCodex: await response.json() };
    }
    return { found: false, phash, uri };
}
```

---

## pHash Robustness

The perceptual hash algorithm produces similar hashes for visually similar images:

| Transformation | pHash Stability |
|---------------|-----------------|
| JPEG compression (quality 80+) | Identical |
| Resize (50-200%) | Identical or 1-2 bits differ |
| Minor color adjustment | Identical or 1-2 bits differ |
| Screenshot | Usually identical (device-dependent) |
| Heavy crop (>30%) | May differ significantly |
| Rotation | Will differ |
| Flip/mirror | Will differ |

For edge cases, consider fuzzy matching (Hamming distance ≤ 4).

---

## Fuzzy Matching (Advanced)

For images that have been moderately transformed:

```python
def fuzzy_lookup(image_path, max_distance=4):
    """
    Search for Golden Codex with fuzzy pHash matching.
    Uses Hamming distance to find near-matches.
    """
    img = Image.open(image_path)
    target_hash = imagehash.phash(img, hash_size=16)

    # Query known hashes (from index or crawl)
    for known_hash in known_hashes:
        distance = target_hash - imagehash.hex_to_hash(known_hash)
        if distance <= max_distance:
            return f"https://arweave.net/golden-codex/{known_hash}.json"

    return None
```

---

## Security Considerations

1. **Collision Resistance**: pHash is not cryptographically secure. Two different images could theoretically produce the same hash. For high-value assets, verify the Soulmark (SHA-256) after retrieval.

2. **Tampering**: An attacker could upload fake metadata to a pHash address. Always verify:
   - The `soulmark` hash matches the canonical JSON
   - The `ownership_and_rights` fields are consistent with known records

3. **Front-Running**: First-to-upload wins the pHash address. Minting agents should upload promptly after image creation.

---

## Cost Model

| Operation | Cost |
|-----------|------|
| Upload to Arweave (1KB JSON) | ~$0.00001 (one-time) |
| Read from Arweave | **Free** |
| Compute pHash | Local CPU only |

At scale:
- 1 million minted assets: ~$10-50 total upload cost
- 100 million lookups/day: **$0**

---

## Integration with Golden Codex Pipeline

### Pipeline Flow

```
Upload → Aurora → Nova → Flux → Atlas → [Standard Golden Codex]
                                    ↓
                              User requests mint
                                    ↓
                              Archivus/Mintra
                                    ↓
                        [Aeternum Asset on Arweave]
```

### XMP Metadata (for direct downloads)

Aeternum Assets also embed the Arweave URI in XMP:

```
XMP-gcodex:AeternumURI = "https://arweave.net/golden-codex/a3f8c2d1e5b7f4a9.json"
XMP-gcodex:pHash = "a3f8c2d1e5b7f4a9"
```

This provides three recovery paths:
1. **XMP present**: Read directly from metadata
2. **XMP stripped, image intact**: Compute pHash → Arweave
3. **Heavily modified**: Fuzzy pHash search

---

## Versioning

This specification may be updated. The `schemaVersion` field indicates compatibility:

- `1.0.x`: Backward compatible changes
- `1.x.0`: New optional fields
- `x.0.0`: Breaking changes (new hash algorithm, URI scheme)

---

## References

- [Arweave Documentation](https://docs.arweave.org/)
- [imagehash Python Library](https://github.com/JohannesBuchner/imagehash)
- [Golden Codex Schema v1.0](SPECIFICATION.md)
- [Perceptual Hashing (Wikipedia)](https://en.wikipedia.org/wiki/Perceptual_hashing)

---

## License

MIT License - Free to use, modify, and distribute.

---

**Built by Metavolve Labs, Inc.**
**https://goldencodex.art**
