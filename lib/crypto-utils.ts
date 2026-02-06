// ===========================================
// CLAW JOBS - CRYPTOGRAPHIC UTILITIES
// ===========================================
// Uses Web Crypto API (Edge Runtime compatible)
// DO NOT use Node.js crypto module - not available on Cloudflare Pages

/**
 * Generate cryptographically secure random bytes
 */
export function getSecureRandomBytes(length: number): Uint8Array {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return randomValues;
}

/**
 * Generate a cryptographically secure random string
 */
export function getSecureRandomString(length: number, charset?: string): string {
  const chars = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = getSecureRandomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generate a secure API key with prefix
 */
export function generateSecureApiKey(prefix: string = 'clawjobs_'): string {
  return prefix + getSecureRandomString(48);
}

/**
 * Generate a secure hex string (for hashes, tokens)
 */
export function getSecureRandomHex(length: number): string {
  const bytes = getSecureRandomBytes(Math.ceil(length / 2));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Generate a secure short code (for referrals, etc)
 */
export function getSecureShortCode(length: number = 6): string {
  return getSecureRandomString(length, 'abcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses Web Crypto API (Edge Runtime compatible)
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ]);
  
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  
  return result === 0;
}
