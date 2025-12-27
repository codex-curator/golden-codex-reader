#!/usr/bin/env python3
"""
Golden Codex Reader - Python SDK v2.0

Complete SDK for reading, verifying, and matching Golden Codex metadata.
Includes XMP extraction, GCUIS decoding, and perceptual hash matching.

Usage:
    # Decode from Base64 file
    python golden_codex_reader.py payload.b64 [output.json]

    # Extract from image using ExifTool
    python golden_codex_reader.py --extract image.png [output.json]

    # Verify integrity
    python golden_codex_reader.py --verify payload.b64 <expected_hash>

    # Match hash against registry (NEW in v2.0)
    python golden_codex_reader.py --match image.png

SDK Functions:
    # XMP/Metadata
    decode_gcuis_payload(base64_payload) -> dict
    extract_from_image(image_path) -> str
    verify_integrity(payload, hash) -> bool

    # Hash Matching (v2.0)
    generate_phash(image_path) -> str
    match_hash(hash, api_base, threshold) -> dict
    verify_provenance(image_path, api_base) -> dict

Copyright (c) 2025 Metavolve Labs, Inc.
"""

import json
import gzip
import base64
import hashlib
import sys
import subprocess
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

# Optional imports for hash matching
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from PIL import Image
    import imagehash
    HAS_IMAGEHASH = True
except ImportError:
    HAS_IMAGEHASH = False


# ============================================================================
# SDK VERSION
# ============================================================================

__version__ = "2.0.0"
SDK_VERSION = __version__

# Default API endpoint for hash matching
DEFAULT_API_BASE = "https://atlas-agent-172867820131.us-west1.run.app"


def base64_decode(encoded_string):
    """Step 1: Base64 decode"""
    return base64.b64decode(encoded_string)


def gzip_decompress(compressed_data):
    """Step 2: GZIP decompress"""
    return gzip.decompress(compressed_data).decode('utf-8')


def json_parse(json_string):
    """Step 3: Parse JSON"""
    return json.loads(json_string)


def decode_gcuis_payload(base64_payload):
    """
    Complete GCUIS decoding pipeline: Base64 → GZIP → JSON

    Args:
        base64_payload (str): Base64 encoded GCUIS payload

    Returns:
        dict: Decoded Golden Codex JSON object
    """
    try:
        # Step 1: Base64 decode
        compressed_data = base64_decode(base64_payload.strip())
        print(f"✓ Step 1: Decoded {len(compressed_data):,} bytes from Base64")

        # Step 2: GZIP decompress
        json_string = gzip_decompress(compressed_data)
        print(f"✓ Step 2: Decompressed to {len(json_string):,} bytes")

        # Step 3: JSON parse
        gc_object = json_parse(json_string)
        print(f"✓ Step 3: Parsed JSON successfully")

        return gc_object, json_string
    except base64.binascii.Error as e:
        raise ValueError(f"Base64 decoding failed: {e}")
    except gzip.BadGzipFile as e:
        raise ValueError(f"GZIP decompression failed (not a valid gzip file): {e}")
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parsing failed: {e}")
    except Exception as e:
        raise ValueError(f"Payload corruption or invalid format: {e}")


def calculate_gc_hash(json_string_or_dict):
    """Calculate GoldenCodexHash (SHA256 of minified JSON)"""
    if isinstance(json_string_or_dict, dict):
        minified = json.dumps(json_string_or_dict, separators=(',', ':'), ensure_ascii=False)
    else:
        minified = json_string_or_dict
    return hashlib.sha256(minified.encode()).hexdigest()


def extract_from_image(image_path, config_path=None):
    """
    Extract GCUIS payload from image using ExifTool

    Args:
        image_path (str): Path to image file
        config_path (str): Optional path to .ExifTool_config

    Returns:
        str: Base64 encoded payload
    """
    cmd = ["exiftool"]

    if config_path:
        cmd.extend(["-config", config_path])

    cmd.extend(["-b", "-XMP-gc:CodexPayload", image_path])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        payload = result.stdout.strip()

        if not payload or payload == "-":
            raise ValueError("No CodexPayload found in image")

        return payload
    except subprocess.CalledProcessError as e:
        raise ValueError(f"ExifTool extraction failed: {e.stderr}")
    except FileNotFoundError:
        raise ValueError("ExifTool not found. Please install ExifTool first.")


def extract_hash_from_image(image_path, hash_tag, config_path=None):
    """Extract hash value from image XMP metadata"""
    cmd = ["exiftool"]

    if config_path:
        cmd.extend(["-config", config_path])

    cmd.extend(["-s", "-s", "-s", f"-{hash_tag}", image_path])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except:
        return None


def verify_integrity(base64_payload, expected_gc_hash):
    """Verify payload integrity by recalculating hash"""
    try:
        # Decode payload
        gc_object, json_string = decode_gcuis_payload(base64_payload)

        # Recalculate hash from minified JSON
        calculated_hash = calculate_gc_hash(gc_object)

        if calculated_hash == expected_gc_hash:
            print(f"✅ INTEGRITY VERIFIED - Hashes match!")
            return True, gc_object
        else:
            print(f"❌ INTEGRITY FAILURE - Hash mismatch!")
            print(f"   Expected:   {expected_gc_hash}")
            print(f"   Calculated: {calculated_hash}")
            return False, gc_object
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False, None


def get_summary_lines(gc_object, calculated_hash: Optional[str] = None,
                      extracted_hash: Optional[str] = None,
                      soulmark: Optional[str] = None):
    """Compose summary lines for console output and meta file"""
    lines = []
    lines.append("="*60)
    lines.append("📊 Golden Codex Summary")
    lines.append("="*60)
    lines.append(f"Schema Version:  {gc_object.get('schemaVersion', 'N/A')}")
    lines.append(f"Agent:           {gc_object.get('agent', 'N/A')}")
    lines.append(f"Artifact ID:     {gc_object.get('artifactId', 'N/A')}")
    lines.append(f"Codex ID:        {gc_object.get('codexId', 'N/A')}")

    if 'timestamp' in gc_object:
        lines.append(f"Initiated:       {gc_object['timestamp'].get('initiated', 'N/A')}")
        lines.append(f"Enriched:        {gc_object['timestamp'].get('enriched', 'N/A')}")

    if 'coreIdentity' in gc_object:
        lines.append(f"Title:           {gc_object['coreIdentity'].get('title', 'N/A')}")
        lines.append(f"Creator:         {gc_object['coreIdentity'].get('creator', 'N/A')}")

    if 'archival' in gc_object:
        lines.append(f"Institution:     {gc_object['archival'].get('institution', 'N/A')}")

    if calculated_hash:
        lines.append(f"Calculated Hash: {calculated_hash}")

    if extracted_hash:
        lines.append(f"Embedded Hash:   {extracted_hash}")

    if soulmark:
        lines.append(f"Soulmark:        {soulmark}")

    lines.append("="*60)
    return lines


def display_summary(gc_object, calculated_hash: Optional[str] = None,
                    extracted_hash: Optional[str] = None,
                    soulmark: Optional[str] = None):
    """Display summary of decoded Golden Codex data"""
    lines = get_summary_lines(gc_object, calculated_hash, extracted_hash, soulmark)
    print()
    for line in lines:
        print(line)


def sanitize_artifact_id(artifact_id: Optional[str], fallback: str) -> str:
    """Return a filesystem-safe artifact identifier"""
    candidate = (artifact_id or fallback or "golden_codex").strip()
    safe = [c if c.isalnum() or c in ("-", "_") else "_" for c in candidate]
    sanitized = "".join(safe).strip("_")
    return sanitized or "golden_codex"


# ============================================================================
# PERCEPTUAL HASH MATCHING (v2.0)
# ============================================================================

def generate_phash(image_path: str, hash_size: int = 16) -> str:
    """
    Generate a perceptual hash (pHash) for an image.

    Uses DCT-based perceptual hashing which is robust to:
    - Resizing and scaling
    - Minor color adjustments
    - JPEG compression (social media)

    Args:
        image_path: Path to the image file
        hash_size: Size of the hash (16 = 256 bits, recommended)

    Returns:
        64-character hex string representing the 256-bit hash

    Raises:
        ImportError: If imagehash/PIL not installed
        ValueError: If image cannot be loaded
    """
    if not HAS_IMAGEHASH:
        raise ImportError(
            "Hash matching requires 'imagehash' and 'Pillow'. "
            "Install with: pip install imagehash Pillow"
        )

    try:
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Generate perceptual hash (DCT-based)
        phash = imagehash.phash(img, hash_size=hash_size)
        return str(phash)

    except Exception as e:
        raise ValueError(f"Failed to generate hash for {image_path}: {e}")


def calculate_hash_similarity(hash1: str, hash2: str) -> float:
    """
    Calculate similarity percentage between two perceptual hashes.

    Args:
        hash1: First hash (hex string)
        hash2: Second hash (hex string)

    Returns:
        Similarity as percentage (0-100)
    """
    if not HAS_IMAGEHASH:
        raise ImportError("Hash comparison requires 'imagehash'. Install with: pip install imagehash")

    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)

    # Hamming distance
    distance = h1 - h2
    max_distance = len(hash1) * 4  # 4 bits per hex char

    return round((1 - distance / max_distance) * 100, 2)


def match_hash(
    hash_value: str,
    api_base: str = DEFAULT_API_BASE,
    threshold: float = 85.0
) -> Dict[str, Any]:
    """
    Query the Golden Codex registry for matching artworks.

    Sends the hash to the Atlas agent's /match-hash endpoint
    which uses LSH-accelerated similarity search.

    Args:
        hash_value: Perceptual hash to search for (64 hex chars)
        api_base: API base URL (default: production Atlas agent)
        threshold: Minimum similarity percentage (0-100)

    Returns:
        Dict with:
            - success: bool
            - matches: List of matching artworks
            - threshold: Applied threshold
            - error: Error message if failed
    """
    if not HAS_REQUESTS:
        raise ImportError(
            "Hash matching requires 'requests'. "
            "Install with: pip install requests"
        )

    try:
        response = requests.post(
            f"{api_base}/match-hash",
            json={
                "hash": hash_value,
                "threshold": threshold
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=30
        )

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"API error {response.status_code}: {response.text}",
                "matches": []
            }

        data = response.json()

        return {
            "success": True,
            "matches": data.get("matches", []),
            "threshold": data.get("threshold", threshold),
            "index_stats": data.get("index_stats", {}),
            "query_hash": hash_value
        }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Request timed out",
            "matches": []
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": str(e),
            "matches": []
        }


def get_hash_stats(api_base: str = DEFAULT_API_BASE) -> Dict[str, Any]:
    """
    Get statistics about the hash index.

    Args:
        api_base: API base URL

    Returns:
        Dict with index statistics
    """
    if not HAS_REQUESTS:
        raise ImportError("Requires 'requests'. Install with: pip install requests")

    try:
        response = requests.get(
            f"{api_base}/hash-stats",
            headers={"Accept": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API error {response.status_code}"}

    except Exception as e:
        return {"error": str(e)}


def verify_provenance(
    image_path: str,
    api_base: str = DEFAULT_API_BASE,
    threshold: float = 85.0
) -> Dict[str, Any]:
    """
    Complete provenance verification for an image.

    This is the main entry point for verifying if an image is a registered
    Golden Codex artwork. Works on ANY copy of the image - even degraded
    versions from social media.

    Flow:
        1. Generate perceptual hash from image
        2. Query Golden Codex registry for matches
        3. Return provenance information if found

    Args:
        image_path: Path to the image file
        api_base: API base URL for registry queries
        threshold: Minimum similarity for a match (default 85%)

    Returns:
        Dict with:
            - verified: bool - True if artwork found in registry
            - method: str - Always "hash" for this function
            - confidence: float - Match confidence percentage
            - gcx_id: str - Golden Codex ID if found
            - title: str - Artwork title if found
            - artist: str - Artist name if found
            - provenance_uri: str - Link to full provenance
            - hash: str - The generated hash
            - error: str - Error message if failed

    Example:
        >>> result = verify_provenance("artwork.jpg")
        >>> if result["verified"]:
        ...     print(f"Found: {result['title']} by {result['artist']}")
        ...     print(f"Confidence: {result['confidence']}%")
        ... else:
        ...     print("Not found in registry")
    """
    try:
        # Step 1: Generate hash
        phash = generate_phash(image_path)

        # Step 2: Query registry
        result = match_hash(phash, api_base, threshold)

        if not result["success"]:
            return {
                "verified": False,
                "method": "hash",
                "error": result.get("error", "Unknown error"),
                "hash": phash
            }

        # Step 3: Process results
        matches = result.get("matches", [])

        if not matches:
            return {
                "verified": False,
                "method": "hash",
                "message": "No matching artwork found in registry",
                "hash": phash,
                "index_stats": result.get("index_stats", {})
            }

        # Return best match
        best = matches[0]

        return {
            "verified": True,
            "method": "hash",
            "confidence": best.get("similarity", 0),
            "gcx_id": best.get("gcx_id"),
            "title": best.get("title"),
            "artist": best.get("artist"),
            "provenance_uri": best.get("provenance_uri"),
            "hash": phash,
            "match_details": best,
            "alternate_matches": matches[1:] if len(matches) > 1 else [],
            "index_stats": result.get("index_stats", {})
        }

    except ImportError as e:
        return {
            "verified": False,
            "method": "hash",
            "error": str(e)
        }
    except Exception as e:
        return {
            "verified": False,
            "method": "hash",
            "error": f"Verification failed: {e}"
        }


# ============================================================================
# OUTPUT FUNCTIONS
# ============================================================================

def write_meta_file(gc_object, output_json_path: Path, calculated_hash: str,
                    extracted_hash: Optional[str], soulmark: Optional[str]) -> Path:
    """Persist a text summary next to the decoded JSON file"""
    summary_lines = get_summary_lines(gc_object, calculated_hash, extracted_hash, soulmark)
    summary_text = "\n".join(summary_lines) + "\n"

    artifact_id = sanitize_artifact_id(gc_object.get('artifactId'), output_json_path.stem)
    meta_path = output_json_path.with_name(f"{artifact_id}_meta.txt")

    with open(meta_path, 'w', encoding='utf-8') as meta_file:
        meta_file.write(summary_text)

    return meta_path


def main():
    if len(sys.argv) < 2:
        print(f"Golden Codex Reader v{SDK_VERSION}")
        print()
        print("Usage:")
        print("  Decode Base64 file:     python golden_codex_reader.py payload.b64 [output.json]")
        print("  Extract from image:     python golden_codex_reader.py --extract image.png [output.json]")
        print("  Verify integrity:       python golden_codex_reader.py --verify payload.b64 <hash>")
        print("  Match hash (v2.0):      python golden_codex_reader.py --match image.png")
        print("  Generate hash only:     python golden_codex_reader.py --hash image.png")
        sys.exit(1)

    mode = "decode"
    input_file = sys.argv[1]

    if input_file == "--extract":
        mode = "extract"
        if len(sys.argv) < 3:
            print("Error: Image path required for --extract mode")
            sys.exit(1)
        input_file = sys.argv[2]
        output_file = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("extracted_codex.json")
    elif input_file == "--verify":
        mode = "verify"
        if len(sys.argv) < 4:
            print("Error: Payload file and expected hash required for --verify mode")
            sys.exit(1)
        input_file = sys.argv[2]
        expected_hash = sys.argv[3]
    elif input_file == "--match":
        mode = "match"
        if len(sys.argv) < 3:
            print("Error: Image path required for --match mode")
            sys.exit(1)
        input_file = sys.argv[2]
    elif input_file == "--hash":
        mode = "hash_only"
        if len(sys.argv) < 3:
            print("Error: Image path required for --hash mode")
            sys.exit(1)
        input_file = sys.argv[2]
    else:
        output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("decoded_codex.json")

    input_path = Path(input_file)

    print(f"Golden Codex Reader v{SDK_VERSION}")
    print(f"Input:  {input_path}")
    print()

    try:
        # Handle hash-only mode (v2.0)
        if mode == "hash_only":
            print("Generating perceptual hash...")
            try:
                phash = generate_phash(str(input_path))
                print(f"Perceptual Hash: {phash}")
                print(f"Hash length: {len(phash)} hex chars ({len(phash) * 4} bits)")
            except ImportError as e:
                print(f"Error: {e}")
                sys.exit(1)
            sys.exit(0)

        # Handle match mode (v2.0)
        if mode == "match":
            print("Verifying provenance via hash matching...")
            print()

            result = verify_provenance(str(input_path))

            if result.get("verified"):
                print("=" * 60)
                print("PROVENANCE VERIFIED")
                print("=" * 60)
                print(f"Confidence:    {result.get('confidence', 0):.1f}%")
                print(f"GCX ID:        {result.get('gcx_id', 'N/A')}")
                print(f"Title:         {result.get('title', 'N/A')}")
                print(f"Artist:        {result.get('artist', 'N/A')}")
                print(f"Provenance:    {result.get('provenance_uri', 'N/A')}")
                print(f"Hash:          {result.get('hash', 'N/A')}")
                print("=" * 60)

                if result.get("alternate_matches"):
                    print(f"\nAlternate matches: {len(result['alternate_matches'])}")
            else:
                print("=" * 60)
                print("NOT FOUND IN REGISTRY")
                print("=" * 60)
                if result.get("error"):
                    print(f"Error: {result['error']}")
                elif result.get("message"):
                    print(f"Message: {result['message']}")
                if result.get("hash"):
                    print(f"Hash: {result['hash']}")
                print("=" * 60)

            sys.exit(0 if result.get("verified") else 1)

        # Handle extract mode
        if mode == "extract":
            # Extract from image using ExifTool
            print("Extracting payload from image using ExifTool...")
            config_path = Path(__file__).parent / "tools" / ".ExifTool_config"
            if not config_path.exists():
                config_path = None

            base64_payload = extract_from_image(str(input_path), str(config_path) if config_path else None)
            print(f"Extracted {len(base64_payload):,} characters")
            print()

            # Also try to extract hashes
            gc_hash = extract_hash_from_image(str(input_path), "XMP-gc:GoldenCodexHash", str(config_path) if config_path else None)
            if not gc_hash:
                gc_hash = extract_hash_from_image(str(input_path), "XMP-artiswa:GoldenCodexHash", str(config_path) if config_path else None)

            soulmark = extract_hash_from_image(str(input_path), "XMP-gc:Soulmark", str(config_path) if config_path else None)

            if gc_hash:
                print(f"Found GoldenCodexHash: {gc_hash[:16]}...{gc_hash[-16:]}")
            if soulmark:
                print(f"Found Soulmark:        {soulmark[:16]}...{soulmark[-16:]}")
            print()

        elif mode == "verify":
            # Verify integrity
            with open(input_path, 'r', encoding='utf-8') as f:
                base64_payload = f.read().strip()

            print(f"🔍 Verifying integrity against hash: {expected_hash[:16]}...{expected_hash[-16:]}")
            print()

            is_valid, gc_object = verify_integrity(base64_payload, expected_hash)
            if is_valid and gc_object:
                display_summary(gc_object)
            sys.exit(0 if is_valid else 1)

        else:
            # Decode from Base64 file
            with open(input_path, 'r', encoding='utf-8') as f:
                base64_payload = f.read().strip()

            print(f"✓ Loaded Base64 payload: {len(base64_payload):,} characters")
            print()

        # Decode pipeline
        print("🔄 Decoding Pipeline:")
        gc_object, json_string = decode_gcuis_payload(base64_payload)
        print()

        # Calculate hash
        gc_hash_calc = calculate_gc_hash(gc_object)
        print(f"✓ Calculated GoldenCodexHash: {gc_hash_calc[:16]}...{gc_hash_calc[-16:]}")
        print()

        # Display summary
        display_summary(gc_object, gc_hash_calc, gc_hash if 'gc_hash' in locals() else None, soulmark if 'soulmark' in locals() else None)

        # Save decoded JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(gc_object, f, indent=2, ensure_ascii=False)

        meta_path = write_meta_file(gc_object, output_file, gc_hash_calc,
                                    gc_hash if 'gc_hash' in locals() else None,
                                    soulmark if 'soulmark' in locals() else None)

        print(f"\n✅ Decoded JSON saved to: {output_file}")
        print(f"📝 Summary written to:     {meta_path}")

        # If we extracted from image and have a hash, verify
        if mode == "extract" and 'gc_hash' in locals() and gc_hash:
            print(f"\n🔍 Verifying extracted payload...")
            if gc_hash_calc == gc_hash:
                print(f"✅ Hash verification PASSED!")
            else:
                print(f"❌ Hash verification FAILED!")
                print(f"   Expected:   {gc_hash}")
                print(f"   Calculated: {gc_hash_calc}")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
