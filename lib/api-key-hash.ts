// ===========================================
// CLAW JOBS - API KEY HASHING
// ===========================================
// Uses SHA-256 via Web Crypto API (Edge Runtime compatible)
//
// Storage model:
//   api_key_prefix: first 16 chars (for indexed lookup)
//   api_key_hash: SHA-256 of full key (for verification)
//   api_key_expires_at: expiry timestamp

/**
 * Hash an API key using SHA-256
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the prefix of an API key for indexed lookup
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16);
}

/**
 * Verify an API key against a stored hash using constant-time comparison
 */
export async function verifyApiKey(providedKey: string, storedHash: string): Promise<boolean> {
  const providedHash = await hashApiKey(providedKey);
  
  // Constant-time comparison to prevent timing attacks
  if (providedHash.length !== storedHash.length) return false;
  
  let result = 0;
  for (let i = 0; i < providedHash.length; i++) {
    result |= providedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get the default API key expiry (90 days from now)
 */
export function getDefaultExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 90); // 90 days
  return expiry;
}

/**
 * Check if an API key has expired
 */
export function isApiKeyExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false; // No expiry set = never expires (legacy keys)
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}
