// ===========================================
// CLAW JOBS - PASSWORD HASHING (FIXED)
// ===========================================
// Uses PBKDF2 with per-user salt instead of weak SHA-256
// Edge Runtime compatible via Web Crypto API

const ITERATIONS = 600_000;  // OWASP recommendation for PBKDF2-SHA256
const KEY_LENGTH = 32;       // 256-bit output
const SALT_LENGTH = 16;      // 128-bit salt

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Hash a password using PBKDF2 with per-user salt
 * Returns: "salt$hash" (both hex-encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8  // bits
  );
  
  // Convert to hex strings
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}$${hashHex}`;
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy SHA-256 hashes (no $ delimiter)
  if (!storedHash.includes('$')) {
    return verifyLegacyPassword(password, storedHash);
  }
  
  const [saltHex, expectedHashHex] = storedHash.split('$');
  if (!saltHex || !expectedHashHex) return false;
  
  // Reconstruct salt from hex
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  const derivedHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Constant-time comparison
  if (derivedHex.length !== expectedHashHex.length) return false;
  
  let result = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    result |= derivedHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify against legacy SHA-256 hash (for migration)
 * TODO: Remove after all passwords migrated
 */
async function verifyLegacyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const salt = process.env.PASSWORD_SALT || 'claw-jobs-salt';
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Constant-time comparison
  if (hashHex.length !== storedHash.length) return false;
  
  let result = 0;
  for (let i = 0; i < hashHex.length; i++) {
    result |= hashHex.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Check if a hash is using the legacy format (needs migration)
 */
export function isLegacyHash(hash: string): boolean {
  return !hash.includes('$');
}
