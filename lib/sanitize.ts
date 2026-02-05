// ===========================================
// CLAW JOBS - SANITIZATION UTILITIES
// ===========================================

/**
 * HTML-escape a string to prevent XSS attacks
 * Use this for any user-controlled content inserted into HTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses crypto.subtle.digest to normalize length and comparison time
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  // Hash both strings - normalizes length and provides constant-time comparison
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ]);
  
  // Compare byte-by-byte in constant time
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  
  return result === 0;
}

/**
 * Sanitize HTML content for safe rendering
 * Removes potentially dangerous tags while preserving safe formatting
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script tags and their contents
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  // Remove data: URLs in src attributes (potential XSS vector)
  clean = clean.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  
  return clean;
}
