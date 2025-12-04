#!/usr/bin/env python3
"""
GCUIS Decoder - Golden Codex Universal Infusion Standard
Extraction and Decompression Utility

Usage:
    # Decode from Base64 file
    python gcuis_decoder.py payload.b64 [output.json]

    # Extract from image using ExifTool
    python gcuis_decoder.py --extract image.png [output.json]

    # Verify integrity
    python gcuis_decoder.py --verify payload.b64 <expected_hash>
"""

import json
import gzip
import base64
import hashlib
import sys
import subprocess
from pathlib import Path
from typing import Optional, Tuple


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
        print("Usage:")
        print("  Decode Base64 file:     python gcuis_decoder.py payload.b64 [output.json]")
        print("  Extract from image:     python gcuis_decoder.py --extract image.png [output.json]")
        print("  Verify integrity:       python gcuis_decoder.py --verify payload.b64 <hash>")
        sys.exit(1)

    mode = "decode"
    input_file = sys.argv[1]

    if input_file == "--extract":
        mode = "extract"
        if len(sys.argv) < 3:
            print("❌ Error: Image path required for --extract mode")
            sys.exit(1)
        input_file = sys.argv[2]
        output_file = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("extracted_codex.json")
    elif input_file == "--verify":
        mode = "verify"
        if len(sys.argv) < 4:
            print("❌ Error: Payload file and expected hash required for --verify mode")
            sys.exit(1)
        input_file = sys.argv[2]
        expected_hash = sys.argv[3]
    else:
        output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("decoded_codex.json")

    input_path = Path(input_file)

    print(f"🔍 GCUIS Decoder - Golden Codex Universal Infusion Standard")
    print(f"📄 Input:  {input_path}")
    print()

    try:
        if mode == "extract":
            # Extract from image using ExifTool
            print("🔄 Extracting payload from image using ExifTool...")
            config_path = Path(__file__).parent / "tools" / ".ExifTool_config"
            if not config_path.exists():
                config_path = None

            base64_payload = extract_from_image(str(input_path), str(config_path) if config_path else None)
            print(f"✓ Extracted {len(base64_payload):,} characters")
            print()

            # Also try to extract hashes
            gc_hash = extract_hash_from_image(str(input_path), "XMP-gc:GoldenCodexHash", str(config_path) if config_path else None)
            if not gc_hash:
                gc_hash = extract_hash_from_image(str(input_path), "XMP-artiswa:GoldenCodexHash", str(config_path) if config_path else None)

            soulmark = extract_hash_from_image(str(input_path), "XMP-gc:Soulmark", str(config_path) if config_path else None)

            if gc_hash:
                print(f"✓ Found GoldenCodexHash: {gc_hash[:16]}...{gc_hash[-16:]}")
            if soulmark:
                print(f"✓ Found Soulmark:        {soulmark[:16]}...{soulmark[-16:]}")
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
