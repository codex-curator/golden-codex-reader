# Golden Codex Schema Specification v1.0.0

## Overview

The Golden Codex schema is a comprehensive metadata standard for digital artworks. It provides:

- Rich provenance and attribution
- AI-generated visual and semantic analysis
- Emotional and thematic mapping
- Rights management
- Personal messaging (SoulWhisper)
- Tamper-evident integrity verification

---

## Encoding: GCUIS (Golden Codex Universal Infusion Standard)

### Encoding Pipeline

```
1. JSON Object
   ↓
2. JSON.stringify() (minified, no whitespace)
   ↓
3. GZIP compress
   ↓
4. Base64 encode
   ↓
5. Embed in XMP-gc:CodexPayload
```

### Decoding Pipeline

```
1. Extract XMP-gc:CodexPayload from image
   ↓
2. Base64 decode
   ↓
3. GZIP decompress
   ↓
4. JSON.parse()
   ↓
5. Golden Codex Object
```

---

## Integrity Verification (Soulmark)

The **Soulmark** is a SHA-256 hash of the canonical JSON payload.

### Calculation

```javascript
// JavaScript
const canonical = JSON.stringify(goldenCodexObject);
const soulmark = crypto.createHash('sha256').update(canonical).digest('hex');
```

```python
# Python
import hashlib, json
canonical = json.dumps(golden_codex_object, separators=(',', ':'))
soulmark = hashlib.sha256(canonical.encode()).hexdigest()
```

### Verification

1. Extract `XMP-gc:CodexPayload` from image
2. Decode to JSON object
3. Calculate SHA-256 of canonical JSON
4. Compare with `XMP-gc:Soulmark`
5. Match = integrity verified

---

## XMP Namespace

**Namespace URI**: `http://ns.goldencodex.art/1.0/`
**Prefix**: `gc`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `XMP-gc:CodexPayload` | Text | GCUIS-encoded metadata |
| `XMP-gc:Soulmark` | Text | SHA-256 integrity hash |
| `XMP-gc:ArtworkID` | Text | Human-readable ID (e.g., GCX00001) |
| `XMP-gc:Version` | Text | Schema version |

---

## Schema Structure

### Required Fields

```json
{
  "schemaVersion": "1.0.0",
  "_identifiers": {
    "artifactId": "REQUIRED"
  },
  "title": "REQUIRED",
  "ownership_and_rights": {
    "copyright": {
      "holder": "REQUIRED"
    }
  }
}
```

### Complete Schema

#### Root Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | string | Yes | Schema version (e.g., "1.0.0") |
| `timestamp` | object | No | Processing timestamps |
| `_identifiers` | object | Yes | Unique identifiers |
| `title` | string | Yes | Artwork title |
| `description` | string | No | Detailed description |

#### _identifiers

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | string (UUID) | No | Universally unique identifier |
| `artifactId` | string | Yes | Human-readable ID (e.g., GCX00001) |
| `codexId` | string | No | Golden Codex registry ID |
| `soulmark` | string | Yes | SHA-256 integrity hash |

#### visual_analysis

AI-generated visual analysis of the artwork.

| Field | Type | Description |
|-------|------|-------------|
| `color_palette` | array | Dominant colors with hex codes |
| `composition` | string | Layout and structure analysis |
| `lighting_and_shading` | string | Light sources and shadows |
| `style_and_technique` | string | Artistic style identification |
| `objective_description` | string | Factual visual description |

#### artistic_statement

| Field | Type | Description |
|-------|------|-------------|
| `intent` | string | Artist's creative intent |
| `symbolism` | object | Symbolic meanings |
| `themes` | array | Thematic elements |
| `cultural_context` | string | Cultural influences |
| `historical_period` | string | Art historical placement |

#### contextual_graph

Semantic relationships and discoverability.

| Field | Type | Description |
|-------|------|-------------|
| `keywords` | array | Searchable keywords |
| `related_artistic_movements` | array | Associated art movements |
| `related_concepts` | array | Abstract concepts |
| `influences` | array | Artistic influences |
| `schema_org_type` | string | Schema.org type (default: "VisualArtwork") |

#### emotional_and_thematic_journey

| Field | Type | Description |
|-------|------|-------------|
| `primary_emotion` | string | Dominant emotional tone |
| `secondary_emotions` | array | Supporting emotions |
| `mood` | string | Overall mood |
| `narrative_arc` | string | Story or journey |

#### symbolism_and_iconography

| Field | Type | Description |
|-------|------|-------------|
| `primary_symbols` | object | Main symbolic elements |
| `secondary_symbols` | object | Supporting symbols |
| `archetypal_elements` | array | Universal archetypes |

#### cultural_and_artistic_context

| Field | Type | Description |
|-------|------|-------------|
| `period_and_movement` | string | Art historical context |
| `influences` | string | Artistic influences |
| `iconography` | string | Iconographic analysis |
| `cultural_significance` | string | Cultural meaning |

#### provenance_and_lineage

| Field | Type | Description |
|-------|------|-------------|
| `artist_information` | string | Artist bio/credits |
| `creation_date` | string | Date of creation |
| `technical_lineage` | string | Technical process |
| `provenance` | string | Ownership history |

#### technical_details

| Field | Type | Description |
|-------|------|-------------|
| `medium_and_technique` | string | Artistic medium |
| `dimensions` | object | Width, height, unit |
| `quality_assessment` | string | Quality notes |
| `file_format` | string | File type |
| `color_space` | string | Color space (e.g., sRGB) |
| `bit_depth` | string | Bit depth |
| `file_size` | string | File size |
| `resolution_dpi` | string | DPI/PPI |

#### creation_credits

| Field | Type | Description |
|-------|------|-------------|
| `human_director` | object | Human creator info |
| `ai_artist_persona` | object | AI collaborator identity |
| `ai_model` | object | AI model details |
| `contributors` | array | Additional contributors |

#### ownership_and_rights

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `copyright` | object | Yes | Copyright information |
| `usage_rights` | object | No | Usage permissions |

##### copyright

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `holder` | string | Yes | Copyright holder name |
| `year` | string | No | Copyright year |
| `statement` | string | No | Copyright statement |

##### usage_rights

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `commercial_use` | boolean | false | Commercial use allowed |
| `modifications_allowed` | boolean | false | Modifications allowed |
| `attribution_required` | boolean | true | Attribution required |
| `attribution_text` | string | - | Attribution text |
| `usage_notes` | string | - | Additional usage info |

#### soulWhisper

Personal message embedded by the artist.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | false | SoulWhisper active |
| `message` | string | - | Personal message |
| `recipient` | string | - | Intended recipient |
| `sender` | string | - | Message sender |
| `language` | string | "en" | Message language |
| `visibility` | string | "private" | "private" or "public" |
| `date` | string | - | Message date |
| `occasion` | string | - | Special occasion |

#### archival

| Field | Type | Description |
|-------|------|-------------|
| `institution` | string | Archiving institution |
| `collection_name` | string | Collection name |
| `curator_notes` | string | Curator annotations |
| `alt_text` | string | Accessibility description |

#### embedding

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `xmp_embedded` | boolean | true | XMP embedding status |
| `iptc_embedded` | boolean | true | IPTC embedding status |
| `custom_fields` | array | [...] | Custom XMP fields used |

#### validation

| Field | Type | Description |
|-------|------|-------------|
| `schema_compliance` | boolean | Schema validation status |
| `required_fields` | array | List of required fields |
| `warnings_issued` | array | Validation warnings |
| `completeness_percentage` | number | Metadata completeness |
| `last_validated` | string | Last validation timestamp |

---

## Example

```json
{
  "schemaVersion": "1.0.0",
  "timestamp": {
    "created": "2025-12-04T10:30:00Z",
    "enriched": "2025-12-04T10:31:45Z"
  },
  "_identifiers": {
    "artifactId": "GCX00042",
    "soulmark": "a7f3c8d9e1b2c3d4e5f6a7b8c9d0e1f2..."
  },
  "title": "Ethereal Mandala",
  "description": "A sacred geometry composition exploring the intersection of mathematics and spirituality.",
  "visual_analysis": {
    "color_palette": [
      { "color_name": "Royal Purple", "hex": "#7B2D8E", "description": "Dominant spiritual tone" },
      { "color_name": "Golden Light", "hex": "#FFD700", "description": "Sacred illumination" }
    ],
    "composition": "Radial symmetry emanating from center, infinite recursive patterns",
    "style_and_technique": "Digital sacred geometry with organic flourishes"
  },
  "emotional_and_thematic_journey": {
    "primary_emotion": "Transcendence",
    "secondary_emotions": ["Wonder", "Serenity"],
    "mood": "Meditative and expansive"
  },
  "ownership_and_rights": {
    "copyright": {
      "holder": "Artist Name",
      "year": "2025",
      "statement": "All rights reserved"
    },
    "usage_rights": {
      "commercial_use": false,
      "attribution_required": true
    }
  },
  "soulWhisper": {
    "enabled": true,
    "message": "May this bring peace to all who behold it",
    "sender": "The Artist"
  }
}
```

---

## Versioning

The schema follows semantic versioning:

- **Major** (1.x.x): Breaking changes
- **Minor** (x.1.x): New fields (backward compatible)
- **Patch** (x.x.1): Documentation/clarifications

---

## Contact

- **Specification Issues**: [GitHub Issues](https://github.com/codex-curator/golden-codex-reader/issues)
- **Email**: curator@golden-codex.com
- **Website**: [goldencodex.art](https://goldencodex.art)
