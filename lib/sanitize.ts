// ===========================================
// CLAW JOBS - INPUT SANITIZATION
// ===========================================
// Comprehensive input sanitization for user-generated content

/**
 * Simple HTML escape for display purposes
 * Use for embedding user content in HTML without breaking URLs
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
 * Maximum lengths for common fields
 */
export const MAX_LENGTHS = {
  name: 50,
  email: 255,
  title: 200,
  description: 5000,
  bio: 500,
  proposal_text: 2000,
  content: 10000,
  url: 2000,
  reason: 500,
  details: 2000,
  default: 1000,
} as const;

/**
 * Sanitize user input - comprehensive protection
 * 
 * @param text - Raw input text
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns Sanitized string
 */
export function sanitizeInput(text: string | null | undefined, maxLength: number = MAX_LENGTHS.default): string {
  if (!text) return '';
  
  let sanitized = String(text);
  
  // 1. Truncate to max length FIRST (prevents DoS via huge payloads)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // 2. Remove null bytes (can bypass security filters)
  sanitized = sanitized.replace(/\0/g, '');
  
  // 3. Remove other control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 4. Normalize unicode (prevents homograph attacks)
  sanitized = sanitized.normalize('NFC');
  
  // 5. Escape HTML entities (XSS prevention)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;');
  
  // 6. Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize input but preserve some formatting (for descriptions/content)
 * Allows newlines and basic structure, still escapes HTML
 */
export function sanitizeContent(text: string | null | undefined, maxLength: number = MAX_LENGTHS.content): string {
  if (!text) return '';
  
  let sanitized = String(text);
  
  // Truncate first
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes and most control chars (keep \n \r \t)
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFC');
  
  // Escape HTML (but NOT &amp; if already escaped)
  sanitized = sanitized
    .replace(/&(?!(amp|lt|gt|quot|#x27|#x2F|#x60);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Collapse excessive newlines (max 3 in a row)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const sanitized = String(email).toLowerCase().trim().substring(0, MAX_LENGTHS.email);
  
  // Basic email regex (not exhaustive, but catches most issues)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const sanitized = String(url).trim().substring(0, MAX_LENGTHS.url);
  
  try {
    const parsed = new URL(sanitized);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate input length without sanitization
 * Returns error message if invalid, null if valid
 */
export function validateLength(
  value: string | null | undefined,
  fieldName: string,
  minLength: number = 0,
  maxLength: number = MAX_LENGTHS.default
): string | null {
  if (!value && minLength > 0) {
    return `${fieldName} is required`;
  }
  
  const length = value?.length || 0;
  
  if (length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  if (length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  
  return null;
}

// ===========================================
// HTML SANITIZATION (for markdown rendering)
// ===========================================
// For local .md files only - not for user-generated content

/**
 * Basic HTML sanitizer for trusted markdown content
 * Removes script tags, event handlers, and dangerous protocols
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.) - just the attribute, not the tag
  clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>"']+/gi, '');
  
  // Remove javascript: URLs - preserve closing quote
  clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  clean = clean.replace(/src\s*=\s*"javascript:[^"]*"/gi, 'src=""');
  clean = clean.replace(/src\s*=\s*'javascript:[^']*'/gi, "src=''");
  
  // Remove data: URLs
  clean = clean.replace(/href\s*=\s*"data:[^"]*"/gi, 'href="#"');
  clean = clean.replace(/href\s*=\s*'data:[^']*'/gi, "href='#'");
  clean = clean.replace(/src\s*=\s*"data:[^"]*"/gi, 'src=""');
  clean = clean.replace(/src\s*=\s*'data:[^']*'/gi, "src=''");
  
  // Remove style tags
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove dangerous tags (but not button - tests expect button to remain)
  clean = clean.replace(/<(iframe|object|embed|form|input)[^>]*>.*?<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form|input)[^>]*\/?>/gi, '');
  
  return clean;
}

export default sanitizeHtml;
