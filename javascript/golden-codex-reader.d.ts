/**
 * Golden Codex Reader - TypeScript Definitions
 * @version 2.0.0
 */

// ============================================
// Types
// ============================================

export interface GoldenCodex {
  schemaVersion?: string;
  _identifiers?: {
    artifactId?: string;
    codexId?: string;
    soulmark?: string;
  };
  artifactId?: string;
  title?: string;
  description?: string;
  ownership_and_rights?: {
    copyright?: {
      holder?: string;
      year?: number;
      statement?: string;
    };
    usage_rights?: {
      commercial_use?: boolean;
    };
  };
  soulWhisper?: {
    enabled?: boolean;
    message?: string;
    sender?: string;
  };
  emotional_and_thematic_journey?: {
    primary_emotion?: string;
  };
  contextual_graph?: {
    keywords?: string[];
  };
  archival?: {
    institution?: string;
  };
  [key: string]: any;
}

export interface IntegrityResult {
  valid: boolean;
  data: GoldenCodex | null;
  calculatedHash?: string;
  expectedHash?: string;
  error?: string;
}

export interface Summary {
  schemaVersion: string;
  artifactId: string;
  title: string;
  description: string;
  copyrightHolder: string;
  soulWhisperEnabled: boolean;
  soulWhisperMessage: string | null;
  primaryEmotion: string;
  keywords: string[];
  institution: string;
}

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface MatchResult {
  success: boolean;
  matches: RegistryMatch[];
  query_hash: string;
  threshold?: number;
  error?: string;
}

export interface RegistryMatch {
  artifactId: string;
  title?: string;
  hash: string;
  distance: number;
  similarity?: number;
}

export interface ProvenanceResult {
  verified: boolean;
  embedded_metadata: GoldenCodex | null;
  perceptual_hash: string | null;
  registry_matches: RegistryMatch[];
  confidence: 'none' | 'low' | 'medium' | 'high';
  error?: string;
}

export interface ComparisonResult {
  match: boolean;
  distance: number;
  threshold: number;
  similarity: number;
  hash1: string;
  hash2: string;
}

export interface HashOptions {
  size?: number;
}

export interface MatchOptions {
  apiBase?: string;
  threshold?: number;
  limit?: number;
}

export interface CompareOptions {
  size?: number;
  threshold?: number;
}

// ============================================
// Constants
// ============================================

export const HASH_SIZE: number;
export const HASH_THRESHOLD: number;
export const DEFAULT_REGISTRY_API: string;

// ============================================
// v1.0 Metadata Functions
// ============================================

/**
 * Decode a GCUIS (Golden Codex Universal Infusion Standard) payload
 * Pipeline: Base64 → GZIP decompress → JSON parse
 */
export function decodePayload(base64Payload: string): GoldenCodex;

/**
 * Calculate the Soulmark hash (SHA-256 of canonical JSON)
 */
export function calculateSoulmark(data: GoldenCodex | string): string;

/**
 * Verify the integrity of a Golden Codex payload
 */
export function verifyIntegrity(base64Payload: string, expectedHash: string): IntegrityResult;

/**
 * Extract a summary of key fields from Golden Codex metadata
 */
export function getSummary(goldenCodex: GoldenCodex): Summary;

/**
 * Validate Golden Codex metadata against required fields
 */
export function validate(goldenCodex: GoldenCodex): ValidationResult;

// ============================================
// v2.0 Hash Matching Functions
// ============================================

/**
 * Generate a perceptual hash from an image
 * Uses average hash algorithm - works in both Node.js and browser
 */
export function generatePHash(
  image: HTMLImageElement | ImageData | Buffer,
  options?: HashOptions
): Promise<string>;

/**
 * Calculate hamming distance between two hashes
 */
export function hammingDistance(hash1: string, hash2: string): number;

/**
 * Check if two hashes match within threshold
 */
export function hashesMatch(hash1: string, hash2: string, threshold?: number): boolean;

/**
 * Query the Golden Codex registry for matching hashes
 */
export function matchHash(pHash: string, options?: MatchOptions): Promise<MatchResult>;

/**
 * Verify provenance of an image by:
 * 1. Computing perceptual hash
 * 2. Querying registry for matches
 */
export function verifyProvenance(
  image: HTMLImageElement | Buffer,
  options?: MatchOptions
): Promise<ProvenanceResult>;

/**
 * Compare two images by perceptual hash
 */
export function compareImages(
  image1: HTMLImageElement | Buffer,
  image2: HTMLImageElement | Buffer,
  options?: CompareOptions
): Promise<ComparisonResult>;
