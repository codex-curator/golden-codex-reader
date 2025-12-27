# Golden Codex Reader

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Schema Version](https://img.shields.io/badge/Schema-v1.0.0-blue.svg)

**Open-source SDK for reading Golden Codex metadata from digital artworks**

---

## What is Golden Codex?

Golden Codex is a rich metadata standard for digital artworks that embeds:

- **Provenance** - Artist information, creation date, ownership history
- **Visual Analysis** - AI-generated analysis of composition, color, style
- **Artistic Intent** - Symbolism, themes, cultural context
- **Emotional Journey** - Primary emotions, mood, narrative arc
- **Rights Management** - Copyright, usage terms, attribution
- **SoulWhisper** - Personal messages embedded by the artist

All metadata is compressed and embedded directly into the image file using XMP standards.

---

## Quick Start

### Python

```bash
pip install golden-codex-reader
```

```python
from golden_codex_reader import decodePayload, verifyIntegrity, getSummary

# Decode from Base64 payload
metadata = decodePayload(base64_payload)
print(metadata['title'])
print(metadata['soulWhisper']['message'])

# Verify integrity
result = verifyIntegrity(payload, expected_soulmark)
if result['valid']:
    print("✅ Metadata integrity verified!")

# Get summary
summary = getSummary(metadata)
print(f"Artwork: {summary['title']} by {summary['copyrightHolder']}")
```

### JavaScript (Node.js)

```bash
npm install golden-codex-reader
```

```javascript
const { decodePayload, verifyIntegrity, getSummary } = require('golden-codex-reader');

// Decode from Base64 payload
const metadata = decodePayload(base64Payload);
console.log(metadata.title);
console.log(metadata.soulWhisper?.message);

// Verify integrity
const result = verifyIntegrity(payload, expectedSoulmark);
if (result.valid) {
  console.log("✅ Metadata integrity verified!");
}

// Get summary
const summary = getSummary(metadata);
console.log(`Artwork: ${summary.title} by ${summary.copyrightHolder}`);
```

### Command Line (Python)

```bash
# Extract from image
python golden_codex_reader.py --extract artwork.png output.json

# Verify integrity
python golden_codex_reader.py --verify payload.b64 <expected_hash>
```

---

## Schema Overview

```json
{
  "schemaVersion": "1.0.0",
  "_identifiers": {
    "artifactId": "GCX00001",
    "soulmark": "sha256..."
  },
  "title": "Ethereal Mandala",
  "description": "A sacred geometry composition...",
  "visual_analysis": { ... },
  "artistic_statement": { ... },
  "emotional_and_thematic_journey": { ... },
  "ownership_and_rights": {
    "copyright": { "holder": "Artist Name" }
  },
  "soulWhisper": {
    "enabled": true,
    "message": "Created with love..."
  }
}
```

See [SPECIFICATION.md](docs/SPECIFICATION.md) for the complete schema.

---

## Encoding Format (GCUIS)

Golden Codex uses the **GCUIS** (Golden Codex Universal Infusion Standard) encoding:

```
JSON → GZIP compress → Base64 encode → XMP embed
```

The Soulmark is a SHA-256 hash of the canonical (minified) JSON, providing tamper-evident verification.

---

## Extracting from Images

Golden Codex metadata is stored in these XMP fields:

| Field | Description |
|-------|-------------|
| `XMP-gc:CodexPayload` | GCUIS-encoded metadata (Base64+GZIP+JSON) |
| `XMP-gc:Soulmark` | SHA-256 integrity hash |
| `XMP-gc:ArtworkID` | Human-readable artwork ID |
| `XMP-gc:Version` | Schema version |

### Using ExifTool

```bash
# Extract raw payload
exiftool -b -XMP-gc:CodexPayload image.png > payload.b64

# View all Golden Codex fields
exiftool -XMP-gc:all image.png
```

---

## Browser Extension

Coming soon: Chrome/Firefox extension to view Golden Codex metadata on any image.

---

## API Reference

### Python

| Function | Description |
|----------|-------------|
| `decodePayload(base64)` | Decode GCUIS payload to JSON object |
| `calculateSoulmark(data)` | Calculate SHA-256 hash of metadata |
| `verifyIntegrity(payload, hash)` | Verify payload matches expected hash |
| `getSummary(metadata)` | Extract key fields for display |
| `extractFromImage(path)` | Extract payload from image file |

### JavaScript

| Function | Description |
|----------|-------------|
| `decodePayload(base64)` | Decode GCUIS payload to JSON object |
| `calculateSoulmark(data)` | Calculate SHA-256 hash of metadata |
| `verifyIntegrity(payload, hash)` | Verify payload matches expected hash |
| `getSummary(metadata)` | Extract key fields for display |
| `validate(metadata)` | Check required fields |

---

## Use Cases

- **Galleries & Museums** - Verify artwork authenticity
- **Collectors** - Check provenance before purchase
- **Artists** - Embed rich metadata in your work
- **Developers** - Build tools around the standard
- **AI/ML** - Train on semantically-rich art metadata
- **Search Engines** - Index artwork by meaning, not just pixels

---

## Aeternum Assets - Permanent Provenance

**For NFTs and permanent artifacts**, Golden Codex supports decentralized provenance on Arweave that survives even when XMP metadata is stripped (social media, screenshots).

### How It Works

The image's **perceptual hash (pHash)** becomes the address:

```python
import imagehash
from PIL import Image
import requests

def get_golden_codex(image_path):
    """Recover Golden Codex from ANY image - even screenshots"""
    img = Image.open(image_path)
    phash = str(imagehash.phash(img, hash_size=16))

    # The hash IS the address - no database query needed
    response = requests.get(f"https://arweave.net/golden-codex/{phash}.json")
    return response.json() if response.ok else None
```

### Why This Matters for AI

| Traditional Metadata | Aeternum Assets |
|---------------------|-----------------|
| Stripped by Twitter/Instagram | Survives social media |
| Lost in screenshots | Recoverable from pixels |
| Requires database lookup | Hash IS the address |
| Centralized server dependency | Decentralized (Arweave) |
| Per-query costs | Free forever |

### Specification

- **pHash Algorithm**: `imagehash.phash(img, hash_size=16)` → 16-char hex
- **Arweave Convention**: `https://arweave.net/golden-codex/{pHash}.json`
- **Permanence**: 200+ years (Arweave endowment model)

See [AETERNUM.md](docs/AETERNUM.md) for the complete specification

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Links

- **Schema Specification**: [goldencodex.art/schema](https://goldencodex.art/schema)
- **GitHub**: [github.com/codex-curator/golden-codex-reader](https://github.com/codex-curator/golden-codex-reader)
- **Golden Codex Website**: [goldencodex.art](https://goldencodex.art)

---

**Built by Metavolve Labs, Inc.**
