// ===========================================
// CLAW JOBS - HTML SANITIZATION
// ===========================================
// Basic HTML sanitization for markdown rendering
// For local .md files only - not for user-generated content

// Allowed tags for markdown content
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
];

// Allowed attributes
const ALLOWED_ATTRS: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title'],
  '*': ['class', 'id'],
};

/**
 * Basic HTML sanitizer for trusted markdown content
 * Removes script tags, event handlers, and dangerous protocols
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and data: protocols from hrefs/srcs
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'src=""');
  clean = clean.replace(/href\s*=\s*["']?\s*data:[^"'>\s]*/gi, 'href="#"');
  
  // Remove style tags
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove iframe, object, embed tags
  clean = clean.replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gi, '');
  
  return clean;
}

export default sanitizeHtml;
