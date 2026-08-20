/**
 * @file services/hashService.js
 * @description Cryptographic hash utilities with timing-safe comparison.
 *
 * WHY TIMING-SAFE COMPARISON:
 * A naive string comparison (hash1 === hash2) returns false as soon as
 * the first mismatched character is found. An attacker can measure the
 * response time to figure out how many leading characters match,
 * effectively "guessing" the hash one character at a time.
 *
 * crypto.timingSafeEqual() always takes the same amount of time regardless
 * of where (or whether) the mismatch occurs. This eliminates timing
 * side-channel attacks entirely.
 *
 * INTERVIEW TALKING POINT:
 *   "I used constant-time hash comparison via crypto.timingSafeEqual to
 *    prevent timing-based side-channel attacks on the verification endpoint."
 */

import crypto from 'crypto';

/**
 * Compares two SHA-256 hashes using constant-time comparison.
 * Prevents timing-based side-channel attacks.
 *
 * @param {string} hash1 - First hash (hex string)
 * @param {string} hash2 - Second hash (hex string)
 * @returns {{ match: boolean, method: string }}
 */
export function compareHashes(hash1, hash2) {
  // Normalize to lowercase (our DB stores lowercase, but input might vary)
  const a = hash1.toLowerCase();
  const b = hash2.toLowerCase();

  // Both must be valid 64-char hex strings
  if (a.length !== 64 || b.length !== 64) {
    return { match: false, method: 'length-mismatch' };
  }

  // Convert to buffers for timingSafeEqual
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  // Constant-time comparison — immune to timing attacks
  const match = crypto.timingSafeEqual(bufA, bufB);

  return { match, method: 'constant-time (timingSafeEqual)' };
}

/**
 * Computes SHA-256 hash of a plain string.
 * Useful for hashing text-based inputs or quick verification.
 *
 * @param {string} input - String to hash
 * @returns {string} 64-char hex digest
 */
export function hashString(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
