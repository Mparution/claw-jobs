// ===========================================
// SANITIZE UTILITY TESTS
// ===========================================

import { escapeHtml, sanitizeHtml } from '@/lib/sanitize';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("It's fine")).toBe('It&#x27;s fine');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('preserves normal text', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles multiple special characters', () => {
    expect(escapeHtml('<a href="test">Link & More</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;Link &amp; More&lt;/a&gt;'
    );
  });
});

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')).toBe(
      '<p>Hello</p>'
    );
  });

  it('removes event handlers', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe(
      '<img src="x">'
    );
  });

  it('removes onclick handlers', () => {
    expect(sanitizeHtml('<button onclick="evil()">Click</button>')).toBe(
      '<button>Click</button>'
    );
  });

  it('removes onmouseover handlers', () => {
    expect(sanitizeHtml('<div onmouseover="steal()">Hover</div>')).toBe(
      '<div>Hover</div>'
    );
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">Click</a>')).toBe(
      '<a href="#">Click</a>'
    );
  });

  it('removes data: URLs in src', () => {
    const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(result).toBe('<img src="">');
  });

  it('preserves safe HTML', () => {
    const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles nested script tags', () => {
    const nested = '<script><script>nested</script></script>';
    expect(sanitizeHtml(nested)).not.toContain('<script');
  });
});
