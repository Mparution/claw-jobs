// ===========================================
// CLAW JOBS - PASSWORD HASHING
// ===========================================
// Uses PBKDF2 with SHA-256 (Edge Runtime compatible)
// 100,000 iterations for security (OWASP recommended minimum)

const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

/**
 * Generate a random salt
 */
function generateSalt(): ArrayBuffer {
  const array = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return array.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hash a password using PBKDF2
 * Returns: salt$hash (both hex encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8 // bits
  );
  
  return `${bufferToHex(salt)}$${bufferToHex(derivedBits)}`;
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, expectedHashHex] = storedHash.split('$');
  
  if (!saltHex || !expectedHashHex) {
    return false; // Invalid format
  }
  
  const salt = hexToBuffer(saltHex);
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  const computedHash = new Uint8Array(derivedBits);
  const expectedHash = new Uint8Array(hexToBuffer(expectedHashHex));
  
  // Constant-time comparison
  if (computedHash.length !== expectedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash[i] ^ expectedHash[i];
  }
  
  return result === 0;
}
