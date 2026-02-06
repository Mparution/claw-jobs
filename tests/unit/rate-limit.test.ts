// ===========================================
// RATE LIMIT TESTS
// ===========================================

import { rateLimit, checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

describe('rateLimit (simple interface)', () => {
  it('allows requests within limit', () => {
    const key = `test-simple-${Date.now()}`;
    const config = { windowMs: 60000, max: 5 };
    
    const result1 = rateLimit(key, config);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);
    
    const result2 = rateLimit(key, config);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('blocks requests over limit', () => {
    const key = `test-block-${Date.now()}`;
    const config = { windowMs: 60000, max: 2 };
    
    rateLimit(key, config); // 1
    rateLimit(key, config); // 2
    const result = rateLimit(key, config); // 3 - should be blocked
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('resets after window expires', () => {
    const key = `test-reset-${Date.now()}`;
    const config = { windowMs: 100, max: 1 };
    
    rateLimit(key, config); // Use up the limit
    const blocked = rateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    
    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterReset = rateLimit(key, config);
        expect(afterReset.allowed).toBe(true);
        expect(afterReset.remaining).toBe(0);
        resolve();
      }, 150);
    });
  });
});

describe('checkRateLimit (detailed interface)', () => {
  it('allows requests within limit', () => {
    const key = `test-detailed-${Date.now()}`;
    const config = { windowMs: 60000, maxRequests: 5 };
    
    const result1 = checkRateLimit(key, config);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);
    
    const result2 = checkRateLimit(key, config);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('blocks requests over limit', () => {
    const key = `test-detailed-block-${Date.now()}`;
    const config = { windowMs: 60000, maxRequests: 2 };
    
    checkRateLimit(key, config); // 1
    checkRateLimit(key, config); // 2
    const result = checkRateLimit(key, config); // 3 - should be blocked
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('includes resetAt timestamp', () => {
    const key = `test-reset-at-${Date.now()}`;
    const config = { windowMs: 60000, maxRequests: 10 };
    
    const result = checkRateLimit(key, config);
    expect(result.resetAt).toBeGreaterThan(Date.now());
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
  });
});

describe('getClientIP', () => {
  it('extracts CF-Connecting-IP header', () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '192.168.1.100',
      },
    });
    expect(getClientIP(request)).toBe('192.168.1.100');
  });

  it('falls back to X-Forwarded-For', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
      },
    });
    expect(getClientIP(request)).toBe('10.0.0.1');
  });

  it('falls back to X-Real-IP', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-real-ip': '172.16.0.1',
      },
    });
    expect(getClientIP(request)).toBe('172.16.0.1');
  });

  it('returns "unknown" when no IP headers present', () => {
    const request = new Request('https://example.com');
    expect(getClientIP(request)).toBe('unknown');
  });

  it('prefers cf-connecting-ip over others', () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      },
    });
    expect(getClientIP(request)).toBe('1.1.1.1');
  });
});

describe('RATE_LIMITS constants', () => {
  it('has register limits', () => {
    expect(RATE_LIMITS.register.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMITS.register.max).toBe(5);
  });

  it('has apply limits', () => {
    expect(RATE_LIMITS.apply.windowMs).toBe(60 * 1000);
    expect(RATE_LIMITS.apply.max).toBe(10);
  });

  it('has postGig limits', () => {
    expect(RATE_LIMITS.postGig.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMITS.postGig.max).toBe(3);
  });

  it('has feedback limits', () => {
    expect(RATE_LIMITS.feedback.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMITS.feedback.maxRequests).toBe(5);
  });

  it('has api limits', () => {
    expect(RATE_LIMITS.api.windowMs).toBe(60 * 1000);
    expect(RATE_LIMITS.api.maxRequests).toBe(100);
  });
});
