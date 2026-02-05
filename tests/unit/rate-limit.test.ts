import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, checkRateLimit, getClientIP } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset state between tests by using unique keys
    vi.useFakeTimers();
  });

  describe('rateLimit (simple interface)', () => {
    it('allows requests within limit', () => {
      const key = `test-simple-${Date.now()}`;
      const config = { windowMs: 60000, max: 3 };

      const r1 = rateLimit(key, config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = rateLimit(key, config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = rateLimit(key, config);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it('blocks requests over limit', () => {
      const key = `test-block-${Date.now()}`;
      const config = { windowMs: 60000, max: 2 };

      rateLimit(key, config);
      rateLimit(key, config);
      const r3 = rateLimit(key, config);

      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('resets after window expires', () => {
      const key = `test-reset-${Date.now()}`;
      const config = { windowMs: 1000, max: 1 };

      const r1 = rateLimit(key, config);
      expect(r1.allowed).toBe(true);

      const r2 = rateLimit(key, config);
      expect(r2.allowed).toBe(false);

      // Fast forward past the window
      vi.advanceTimersByTime(1100);

      const r3 = rateLimit(key, config);
      expect(r3.allowed).toBe(true);
    });
  });

  describe('checkRateLimit (detailed interface)', () => {
    it('allows requests within limit', () => {
      const key = `test-detailed-${Date.now()}`;
      const config = { windowMs: 60000, maxRequests: 3 };

      const r1 = checkRateLimit(key, config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
    });

    it('blocks requests over limit', () => {
      const key = `test-detailed-block-${Date.now()}`;
      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit(key, config);
      checkRateLimit(key, config);
      const r3 = checkRateLimit(key, config);

      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('returns correct resetAt timestamp', () => {
      const key = `test-resetAt-${Date.now()}`;
      const windowMs = 60000;
      const config = { windowMs, maxRequests: 5 };
      const now = Date.now();

      const result = checkRateLimit(key, config);
      expect(result.resetAt).toBeGreaterThanOrEqual(now + windowMs - 100);
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 100);
    });
  });

  describe('getClientIP', () => {
    it('extracts CF-Connecting-IP header', () => {
      const request = new Request('http://test.com', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      });
      expect(getClientIP(request)).toBe('1.2.3.4');
    });

    it('falls back to X-Forwarded-For', () => {
      const request = new Request('http://test.com', {
        headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' },
      });
      expect(getClientIP(request)).toBe('5.6.7.8');
    });

    it('falls back to X-Real-IP', () => {
      const request = new Request('http://test.com', {
        headers: { 'x-real-ip': '9.10.11.12' },
      });
      expect(getClientIP(request)).toBe('9.10.11.12');
    });

    it('returns unknown when no IP headers', () => {
      const request = new Request('http://test.com');
      expect(getClientIP(request)).toBe('unknown');
    });

    it('prioritizes CF-Connecting-IP over others', () => {
      const request = new Request('http://test.com', {
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2',
          'x-real-ip': '3.3.3.3',
        },
      });
      expect(getClientIP(request)).toBe('1.1.1.1');
    });
  });
});
