# Golden Codex Reader

**Open-source reader for extracting Soulprint metadata from Golden Codex images.**

Every Golden Codex image carries a compressed JSON payload — the **Soulprint** — containing 111+ structured fields of semantic metadata: artistic analysis, emotional mapping, cultural context, provenance, and more. This reader unlocks that metadata.

## Install

```bash
pip install golden-codex-reader
```

Or use directly:

```bash
git clone https://github.com/codex-curator/golden-codex-reader.git
cd golden-codex-reader
pip install -r requirements.txt
```

**Requires [ExifTool](https://exiftool.org)** for image extraction:
```bash
# Ubuntu/Debian
apt install libimage-exiftool-perl

# macOS
brew install exiftool

# Windows
# Download from https://exiftool.org
```

## Quick Start

### Command Line

```bash
# Extract metadata from a Golden Codex image
python golden_codex_reader.py image.png

# Save extracted metadata to JSON
python golden_codex_reader.py image.png --output metadata.json

# Verify integrity (Soulmark check)
python golden_codex_reader.py image.png --verify

# Read C2PA content credentials
python golden_codex_reader.py image.png --c2pa

# Output raw JSON
python golden_codex_reader.py image.png --json

# Batch extract from directory
python golden_codex_reader.py --batch ./images/ --output ./metadata/
```

### Python SDK

```python
from golden_codex_reader import extract_soulprint, verify_soulmark, read_c2pa

# Extract the full Soulprint metadata
metadata = extract_soulprint("GCX-AA-00001_final.png")

print(f"Title: {metadata['title']}")
print(f"Artist: {metadata['creation_credits']['original_artist']}")
print(f"Schema: {metadata['schemaVersion']}")

# The artwork speaks
print(f"Soul Whisper: {metadata['soulWhisper']['message']}")

# Emotional mapping
emotions = metadata['emotional_and_thematic_journey']
print(f"Emotion: {emotions['primary_emotion']}")
print(f"Mood: {emotions['mood']}")

# Artistic analysis
print(f"Intent: {metadata['artistic_statement']['intent']}")
print(f"Period: {metadata['artistic_statement']['historical_period']}")

# Visual analysis
va = metadata['visual_analysis']
print(f"Composition: {va['composition']}")
print(f"Colors: {va['color_palette']}")
```

### Verify Integrity

```python
from golden_codex_reader import extract_soulprint, verify_soulmark, calculate_soulmark

metadata = extract_soulprint("image.png")

# Check if metadata has been tampered with
if verify_soulmark(metadata):
    print("Soulmark verified - metadata is intact")
else:
    print("WARNING: metadata may have been modified")

# Get the Soulmark hash
soulmark = calculate_soulmark(metadata)
print(f"Soulmark: {soulmark}")
```

### Read C2PA Content Credentials

```python
from golden_codex_reader import read_c2pa

# Requires: pip install c2pa-python
creds = read_c2pa("GCX-AA-00001_final.png")
if creds:
    print(f"Signed by: {creds['claim_generator']}")
    print(f"Assertions: {len(creds['assertions'])}")
    for assertion in creds['assertions']:
        print(f"  - {assertion.get('label', 'unknown')}")
```

### Decode Raw Payload

```python
from golden_codex_reader import decode_payload, encode_payload

# If you already have the Base64 payload string
payload_b64 = "H4sIAAAAAAAA..."  # from XMP-gc:CodexPayload
metadata = decode_payload(payload_b64)

# Re-encode
encoded = encode_payload(metadata)
```

## What's Inside a Soulprint

Every Golden Codex image contains structured metadata across these dimensions:

| Section | Example Fields |
|---------|---------------|
| **Identity** | `artifactId`, `codexId`, `soulmark`, `schemaVersion` |
| **Core** | `title`, `description` |
| **Creation** | `original_artist`, `source_institution`, `creation_date` |
| **Artistic** | `intent`, `historical_period`, `medium_and_technique` |
| **Visual** | `composition`, `color_palette`, `lighting_and_shading`, `style_and_technique` |
| **Emotional** | `primary_emotion`, `secondary_emotions`, `mood`, `narrative_arc` |
| **Cultural** | `period_and_movement`, `influences`, `cross_cultural_resonances` |
| **Symbolism** | `primary_symbols`, `recurring_motifs`, `archetypal_patterns` |
| **Soul Whisper** | `message` — the artwork speaks in first person |
| **Provenance** | `source_institution`, `provenance`, `digital_preservation` |
| **Rights** | `copyright_holder`, `license`, `commercial_use_permitted` |
| **Archival** | `collection_name`, `accession_number`, `alt_text` |
| **Discovery** | `schema_url`, `reader_url`, `verification_url` |

Full schema: [Golden Codex v1.1-GCS-CORE](https://goldencodex.art/schema/v1.0)

## How It Works

Golden Codex metadata is stored in images using the GCUIS (Golden Codex Universal Infusion Standard) encoding:

```
JSON metadata → GZIP compress → Base64 encode → XMP-gc:CodexPayload
```

This reader reverses the process:

```
XMP-gc:CodexPayload → Base64 decode → GZIP decompress → JSON metadata
```

The metadata is embedded using ExifTool with the custom `gc` XMP namespace, which preserves the data through standard image operations while keeping the image pixels completely untouched.

## Integrity Verification

Every Golden Codex image carries cryptographic integrity proofs:

| Check | Method | What It Proves |
|-------|--------|----------------|
| **Soulmark** | SHA-256 of canonical JSON | Metadata hasn't been tampered with |
| **GoldenCodexHash** | SHA-256 of minified JSON | Payload integrity |
| **C2PA Manifest** | ES256 + DigiCert TSA | Content provenance chain |

```python
from golden_codex_reader import verify_image_integrity

result = verify_image_integrity("image.png")
print(f"Valid: {result['valid']}")
print(f"Soulmark match: {result['soulmark_match']}")
print(f"Artifact: {result['artifact_id']}")
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `extract_soulprint(image_path)` | Extract full metadata from image |
| `decode_payload(base64_string)` | Decode a raw GCUIS payload |
| `encode_payload(metadata_dict)` | Encode metadata to GCUIS format |

### Verification

| Function | Description |
|----------|-------------|
| `verify_soulmark(metadata)` | Check Soulmark integrity |
| `calculate_soulmark(metadata)` | Compute Soulmark hash |
| `calculate_codex_hash(metadata)` | Compute GoldenCodexHash |
| `verify_image_integrity(image_path)` | Full integrity check |

### C2PA

| Function | Description |
|----------|-------------|
| `read_c2pa(image_path)` | Read C2PA content credentials |

### Extraction

| Function | Description |
|----------|-------------|
| `extract_payload_from_image(path)` | Get raw Base64 payload |
| `extract_xmp_field(path, field)` | Get any XMP field value |
| `batch_extract(input_dir, output_dir)` | Process directory of images |

## Used By

- **[Alexandria Aeternum 10K](https://huggingface.co/datasets/Metavolve-Labs/alexandria-aeternum-genesis)** — 10,097 provenance-verified artworks with C2PA content credentials
- **[Alexandria Aeternum Genesis](https://huggingface.co/datasets/Metavolve-Labs/alexandria-aeternum-genesis)** — 1,000 artifact research sample

## Requirements

- Python 3.8+
- [ExifTool](https://exiftool.org) (for image extraction)
- Optional: `c2pa-python` (for C2PA reading)
- Optional: `Pillow`, `imagehash` (for perceptual hashing)

## License

MIT License - see [LICENSE](LICENSE)

## Links

- [Golden Codex](https://golden-codex.com) — Provenance platform
- [iAeternum.ai](https://iaeternum.ai) — Full archive
- [Metavolve Labs](https://metavolvelabsinc.com) — Infrastructure for cultural permanence

---

*Built by [Metavolve Labs, Inc.](https://metavolvelabsinc.com) — Infrastructure of memory for the AI age.*
