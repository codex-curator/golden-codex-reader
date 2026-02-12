#!/usr/bin/env python3
"""
Golden Codex Reader — Open-Source Soulprint Metadata Extractor

Extract, decode, and verify the rich Golden Codex metadata embedded in images.
Every Golden Codex image carries a compressed JSON payload (the "Soulprint")
containing 111+ structured fields of semantic metadata — artistic analysis,
emotional mapping, cultural context, provenance, and more.

This reader unlocks that metadata.

Encoding: Base64 → GZIP → JSON (stored in XMP-gc:CodexPayload)

Usage:
    # Extract from a Golden Codex image
    python golden_codex_reader.py image.png

    # Extract and save to JSON
    python golden_codex_reader.py image.png --output metadata.json

    # Decode a raw Base64 payload file
    python golden_codex_reader.py --decode payload.b64

    # Verify metadata integrity (Soulmark check)
    python golden_codex_reader.py image.png --verify

    # Read C2PA content credentials
    python golden_codex_reader.py image.png --c2pa

    # Batch extract from directory
    python golden_codex_reader.py --batch ./images/ --output ./metadata/

SDK Functions:
    extract_soulprint(image_path) -> dict
    decode_payload(base64_string) -> dict
    verify_soulmark(metadata_dict) -> bool
    read_c2pa(image_path) -> dict

Copyright (c) 2025-2026 Metavolve Labs, Inc.
License: MIT
"""

import json
import gzip
import base64
import hashlib
import sys
import subprocess
import argparse
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

__version__ = "3.0.0"

# ============================================================================
# CORE: GCUIS DECODING
# ============================================================================

def decode_payload(base64_payload: str) -> Dict[str, Any]:
    """
    Decode a Golden Codex GCUIS payload: Base64 → GZIP → JSON.

    The CodexPayload field in Golden Codex images contains the entire
    structured metadata compressed as: JSON → GZIP → Base64.

    Args:
        base64_payload: The Base64-encoded string from XMP-gc:CodexPayload

    Returns:
        Decoded Golden Codex metadata as a Python dict

    Raises:
        ValueError: If the payload is corrupted or invalid
    """
    try:
        compressed = base64.b64decode(base64_payload.strip())
        json_string = gzip.decompress(compressed).decode('utf-8')
        return json.loads(json_string)
    except base64.binascii.Error as e:
        raise ValueError(f"Base64 decode failed: {e}")
    except gzip.BadGzipFile as e:
        raise ValueError(f"GZIP decompress failed: {e}")
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parse failed: {e}")


def encode_payload(metadata: Dict[str, Any]) -> str:
    """
    Encode metadata dict to GCUIS format: JSON → GZIP → Base64.

    Args:
        metadata: Golden Codex metadata dict

    Returns:
        Base64-encoded GCUIS payload string
    """
    json_bytes = json.dumps(metadata, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    compressed = gzip.compress(json_bytes)
    return base64.b64encode(compressed).decode('ascii')


# ============================================================================
# EXTRACTION: GET PAYLOAD FROM IMAGES
# ============================================================================

def extract_payload_from_image(image_path: str) -> str:
    """
    Extract the raw CodexPayload string from an image using ExifTool.

    Requires ExifTool to be installed (https://exiftool.org).

    Args:
        image_path: Path to a Golden Codex image

    Returns:
        Base64-encoded payload string

    Raises:
        ValueError: If no payload found or ExifTool not available
    """
    cmd = ["exiftool", "-b", "-XMP-gc:CodexPayload", str(image_path)]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        payload = result.stdout.strip()
        if not payload or payload == "-":
            raise ValueError(f"No CodexPayload found in {image_path}")
        return payload
    except subprocess.CalledProcessError as e:
        raise ValueError(f"ExifTool failed: {e.stderr.strip()}")
    except FileNotFoundError:
        raise ValueError(
            "ExifTool not found. Install from https://exiftool.org "
            "or: apt install libimage-exiftool-perl"
        )


def extract_xmp_field(image_path: str, field: str) -> Optional[str]:
    """Extract a single XMP field value from an image."""
    cmd = ["exiftool", "-s", "-s", "-s", f"-{field}", str(image_path)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        value = result.stdout.strip()
        return value if value and value != "-" else None
    except:
        return None


def extract_soulprint(image_path: str) -> Dict[str, Any]:
    """
    Extract and decode the full Soulprint metadata from a Golden Codex image.

    This is the main entry point for reading Golden Codex metadata.

    Args:
        image_path: Path to a Golden Codex image (.png, .jpg, .webp)

    Returns:
        Dict containing the full Golden Codex metadata (111+ fields)

    Raises:
        ValueError: If extraction or decoding fails

    Example:
        >>> metadata = extract_soulprint("GCX-AA-00001_final.png")
        >>> print(metadata['title'])
        '"King Lear," Act I, Scene I'
        >>> print(metadata['soulWhisper']['message'])
        'I am the silence of truth that echoes louder than the thunder of kings.'
    """
    payload = extract_payload_from_image(image_path)
    return decode_payload(payload)


# ============================================================================
# INTEGRITY: SOULMARK VERIFICATION
# ============================================================================

def calculate_soulmark(metadata: Dict[str, Any]) -> str:
    """
    Calculate the Soulmark hash (SHA-256 of canonical metadata).

    The Soulmark is computed from the metadata with volatile fields removed,
    serialized as sorted JSON, and hashed with SHA-256. Any modification
    to the metadata will produce a different Soulmark.

    Args:
        metadata: Golden Codex metadata dict

    Returns:
        SHA-256 hex digest (64 characters)
    """
    # Remove volatile fields that change between versions
    volatile_keys = {'_metadata', 'timestamps', 'sourceUri'}
    stable = {k: v for k, v in metadata.items() if k not in volatile_keys}
    canonical = json.dumps(stable, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def calculate_codex_hash(metadata: Dict[str, Any]) -> str:
    """
    Calculate the GoldenCodexHash (SHA-256 of minified JSON).

    This hash covers the entire metadata payload and is stored alongside
    the CodexPayload in the image's XMP metadata.

    Args:
        metadata: Golden Codex metadata dict

    Returns:
        SHA-256 hex digest
    """
    minified = json.dumps(metadata, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(minified.encode()).hexdigest()


def verify_soulmark(metadata: Dict[str, Any]) -> bool:
    """
    Verify metadata integrity by checking the embedded Soulmark.

    Recalculates the Soulmark from the metadata and compares it to
    the stored value in _identifiers.soulmark.

    Args:
        metadata: Golden Codex metadata dict

    Returns:
        True if the Soulmark matches (metadata is intact)
    """
    stored = (metadata.get('_identifiers', {}).get('soulmark') or
              metadata.get('soulmark_hash', ''))
    if not stored:
        return False
    calculated = calculate_soulmark(metadata)
    return calculated == stored


def verify_image_integrity(image_path: str) -> Dict[str, Any]:
    """
    Full integrity verification of a Golden Codex image.

    Extracts the metadata, verifies the Soulmark, and checks the
    GoldenCodexHash if present in XMP.

    Args:
        image_path: Path to a Golden Codex image

    Returns:
        Dict with verification results:
            - valid: bool
            - soulmark_match: bool
            - codex_hash_match: bool or None
            - metadata: the extracted metadata
            - artifact_id: str
            - soulmark: str
    """
    result = {
        'valid': False,
        'soulmark_match': False,
        'codex_hash_match': None,
        'metadata': None,
        'artifact_id': None,
        'soulmark': None,
    }

    try:
        # Extract and decode
        payload_b64 = extract_payload_from_image(image_path)
        metadata = decode_payload(payload_b64)
        result['metadata'] = metadata
        result['artifact_id'] = metadata.get('_identifiers', {}).get('artifactId', 'unknown')

        # Verify Soulmark
        result['soulmark'] = calculate_soulmark(metadata)
        result['soulmark_match'] = verify_soulmark(metadata)

        # Verify GoldenCodexHash (if embedded in XMP)
        embedded_hash = extract_xmp_field(image_path, "XMP-gc:GoldenCodexHash")
        if embedded_hash:
            calculated_hash = calculate_codex_hash(metadata)
            result['codex_hash_match'] = (calculated_hash == embedded_hash)

        result['valid'] = result['soulmark_match']
        if result['codex_hash_match'] is not None:
            result['valid'] = result['valid'] and result['codex_hash_match']

    except Exception as e:
        result['error'] = str(e)

    return result


# ============================================================================
# C2PA: CONTENT CREDENTIAL READING
# ============================================================================

def read_c2pa(image_path: str) -> Optional[Dict[str, Any]]:
    """
    Read C2PA content credentials from a Golden Codex image.

    Requires the c2pa-python package (pip install c2pa-python).

    Args:
        image_path: Path to a C2PA-signed image

    Returns:
        Dict with C2PA manifest info, or None if no C2PA found

    Example:
        >>> creds = read_c2pa("GCX-AA-00001_final.png")
        >>> if creds:
        ...     print(f"Signed: {creds['title']}")
        ...     print(f"Assertions: {len(creds['assertions'])}")
    """
    try:
        import c2pa
        import io

        data = Path(image_path).read_bytes()
        reader = c2pa.Reader('image/png', io.BytesIO(data))
        manifest = reader.get_active_manifest()

        if not manifest:
            return None

        return {
            'title': manifest.get('title', ''),
            'format': manifest.get('format', ''),
            'instance_id': manifest.get('instance_id', ''),
            'claim_generator': manifest.get('claim_generator', ''),
            'assertions': manifest.get('assertions', []),
            'signature_info': manifest.get('signature_info', {}),
            'has_credentials': True,
        }

    except ImportError:
        raise ImportError(
            "C2PA reading requires 'c2pa-python'. "
            "Install with: pip install c2pa-python"
        )
    except Exception:
        return None


# ============================================================================
# DISPLAY HELPERS
# ============================================================================

def format_summary(metadata: Dict[str, Any], soulmark: Optional[str] = None) -> str:
    """Format a human-readable summary of Golden Codex metadata."""
    lines = []
    lines.append("=" * 60)
    lines.append("Golden Codex Soulprint")
    lines.append("=" * 60)

    # Identity
    ids = metadata.get('_identifiers', {})
    lines.append(f"Artifact ID:     {ids.get('artifactId', 'N/A')}")
    lines.append(f"Schema:          {metadata.get('schemaVersion', 'N/A')}")

    # Core
    lines.append(f"Title:           {metadata.get('title', 'N/A')}")

    credits = metadata.get('creation_credits', {})
    lines.append(f"Artist:          {credits.get('original_artist', 'N/A')}")
    lines.append(f"Institution:     {credits.get('source_institution', 'N/A')}")

    # Timestamps
    ts = metadata.get('timestamp', {})
    if ts.get('created'):
        lines.append(f"Created:         {ts['created']}")

    # Artistic
    statement = metadata.get('artistic_statement', {})
    if statement.get('intent'):
        intent = statement['intent']
        if len(intent) > 100:
            intent = intent[:97] + "..."
        lines.append(f"Intent:          {intent}")

    if statement.get('historical_period'):
        lines.append(f"Period:          {statement['historical_period']}")

    # Emotional
    emotions = metadata.get('emotional_and_thematic_journey', {})
    if emotions.get('primary_emotion'):
        lines.append(f"Emotion:         {emotions['primary_emotion']}")
    if emotions.get('mood'):
        lines.append(f"Mood:            {emotions['mood']}")

    # Soul Whisper
    whisper = metadata.get('soulWhisper', {})
    if whisper.get('message'):
        msg = whisper['message']
        if len(msg) > 100:
            msg = msg[:97] + "..."
        lines.append(f"Soul Whisper:    {msg}")

    # Integrity
    if soulmark:
        lines.append(f"Soulmark:        {soulmark[:16]}...{soulmark[-16:]}")
    elif ids.get('soulmark'):
        sm = ids['soulmark']
        lines.append(f"Soulmark:        {sm[:16]}...{sm[-16:]}")

    lines.append("=" * 60)
    return "\n".join(lines)


# ============================================================================
# BATCH PROCESSING
# ============================================================================

def batch_extract(input_dir: str, output_dir: str, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Extract Soulprint metadata from all images in a directory.

    Args:
        input_dir: Directory containing Golden Codex images
        output_dir: Directory to write extracted JSON files
        limit: Maximum number of images to process

    Returns:
        Summary dict with counts and errors
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    images = []
    for ext in ('*.png', '*.jpg', '*.jpeg', '*.webp'):
        images.extend(input_path.glob(ext))
    images.sort()

    if limit:
        images = images[:limit]

    results = {'total': len(images), 'success': 0, 'failed': 0, 'errors': []}

    for i, img in enumerate(images):
        try:
            metadata = extract_soulprint(str(img))
            artifact_id = metadata.get('_identifiers', {}).get('artifactId', img.stem)

            out_file = output_path / f"{artifact_id}_meta.json"
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            results['success'] += 1

            if (i + 1) % 100 == 0:
                print(f"  Extracted {i+1}/{len(images)}")

        except Exception as e:
            results['failed'] += 1
            results['errors'].append({'file': img.name, 'error': str(e)})

    return results


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Golden Codex Reader — Extract Soulprint metadata from images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s image.png                     Extract and display metadata
  %(prog)s image.png -o metadata.json    Extract and save to file
  %(prog)s image.png --verify            Verify metadata integrity
  %(prog)s image.png --c2pa              Read C2PA content credentials
  %(prog)s --decode payload.b64          Decode raw Base64 payload
  %(prog)s --batch ./images/ -o ./meta/  Batch extract from directory

More info: https://github.com/codex-curator/golden-codex-reader
        """
    )

    parser.add_argument('input', nargs='?', help='Image file or Base64 payload file')
    parser.add_argument('-o', '--output', help='Output JSON file or directory')
    parser.add_argument('--decode', action='store_true', help='Decode a raw Base64 payload file')
    parser.add_argument('--verify', action='store_true', help='Verify metadata integrity')
    parser.add_argument('--c2pa', action='store_true', help='Read C2PA content credentials')
    parser.add_argument('--batch', metavar='DIR', help='Batch extract from directory')
    parser.add_argument('--limit', type=int, help='Limit for batch processing')
    parser.add_argument('--json', action='store_true', help='Output raw JSON (no summary)')
    parser.add_argument('--version', action='version', version=f'%(prog)s {__version__}')

    args = parser.parse_args()

    if not args.input and not args.batch:
        parser.print_help()
        sys.exit(1)

    # Batch mode
    if args.batch:
        output_dir = args.output or './extracted_metadata'
        print(f"Golden Codex Reader v{__version__}")
        print(f"Batch extracting from: {args.batch}")
        print(f"Output: {output_dir}")
        print()

        results = batch_extract(args.batch, output_dir, args.limit)
        print(f"\nDone: {results['success']} extracted, {results['failed']} failed")

        if results['errors']:
            print(f"\nErrors:")
            for err in results['errors'][:10]:
                print(f"  {err['file']}: {err['error']}")

        sys.exit(0 if results['failed'] == 0 else 1)

    input_path = Path(args.input)

    # Decode raw payload
    if args.decode:
        print(f"Golden Codex Reader v{__version__}")
        print(f"Decoding: {input_path}")
        print()

        payload = input_path.read_text(encoding='utf-8').strip()
        metadata = decode_payload(payload)

        if args.json:
            print(json.dumps(metadata, indent=2, ensure_ascii=False))
        else:
            print(format_summary(metadata))
            print()

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            print(f"Saved to: {args.output}")

        sys.exit(0)

    # C2PA mode
    if args.c2pa:
        print(f"Golden Codex Reader v{__version__}")
        print(f"Reading C2PA: {input_path}")
        print()

        creds = read_c2pa(str(input_path))
        if creds:
            print("C2PA Content Credentials Found")
            print("=" * 40)
            print(f"Title:           {creds['title']}")
            print(f"Generator:       {creds['claim_generator']}")
            print(f"Assertions:      {len(creds['assertions'])}")
            sig = creds.get('signature_info', {})
            if sig:
                print(f"Issuer:          {sig.get('issuer', 'N/A')}")
                print(f"Time:            {sig.get('time', 'N/A')}")
            print("=" * 40)

            if args.json:
                print()
                print(json.dumps(creds, indent=2, ensure_ascii=False))
        else:
            print("No C2PA content credentials found.")
            sys.exit(1)

        sys.exit(0)

    # Verify mode
    if args.verify:
        print(f"Golden Codex Reader v{__version__}")
        print(f"Verifying: {input_path}")
        print()

        result = verify_image_integrity(str(input_path))

        if result['valid']:
            print("INTEGRITY VERIFIED")
            print(f"  Artifact:       {result['artifact_id']}")
            print(f"  Soulmark match: {result['soulmark_match']}")
            if result['codex_hash_match'] is not None:
                print(f"  CodexHash match: {result['codex_hash_match']}")
            print(f"  Soulmark:       {result['soulmark']}")
        else:
            print("INTEGRITY CHECK FAILED")
            if result.get('error'):
                print(f"  Error: {result['error']}")
            else:
                print(f"  Soulmark match: {result['soulmark_match']}")
                if result['codex_hash_match'] is not None:
                    print(f"  CodexHash match: {result['codex_hash_match']}")

        sys.exit(0 if result['valid'] else 1)

    # Default: extract and display
    print(f"Golden Codex Reader v{__version__}")
    print(f"Reading: {input_path}")
    print()

    try:
        metadata = extract_soulprint(str(input_path))
        soulmark = calculate_soulmark(metadata)

        if args.json:
            print(json.dumps(metadata, indent=2, ensure_ascii=False))
        else:
            print(format_summary(metadata, soulmark))

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            print(f"\nSaved to: {args.output}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
