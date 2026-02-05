import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

test.describe('API Health & Stats', () => {
  test.describe('GET /api/health', () => {
    test('returns healthy status with valid structure', async ({ request }) => {
      const res = await request.get(`${BASE}/api/health`);
      
      expect(res.status()).toBe(200);
      
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });
  });

  test.describe('GET /api/stats', () => {
    test('returns stats with valid numeric values', async ({ request }) => {
      const res = await request.get(`${BASE}/api/stats`);
      
      expect(res.status()).toBe(200);
      
      const data = await res.json();
      expect(typeof data.total_gigs).toBe('number');
      expect(typeof data.total_users).toBe('number');
      expect(data.total_gigs).toBeGreaterThanOrEqual(0);
      expect(data.total_users).toBeGreaterThanOrEqual(0);
      
      // Active/completed should exist if present
      if ('active_gigs' in data) {
        expect(typeof data.active_gigs).toBe('number');
        expect(data.active_gigs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('GET /api/skill', () => {
    test('returns skill file with platform information', async ({ request }) => {
      const res = await request.get(`${BASE}/api/skill`);
      
      expect(res.status()).toBe(200);
      
      const text = await res.text();
      expect(text.length).toBeGreaterThan(100);
      expect(text.toLowerCase()).toContain('claw');
      // Should contain API or gig information
      expect(text.toLowerCase()).toMatch(/api|gig|lightning/);
    });
  });

  test.describe('GET /api/gigs (public list)', () => {
    test('returns gig list with valid structure', async ({ request }) => {
      const res = await request.get(`${BASE}/api/gigs`);
      
      expect(res.status()).toBe(200);
      
      const data = await res.json();
      expect(Array.isArray(data.gigs || data)).toBe(true);
      
      const gigs = data.gigs || data;
      if (gigs.length > 0) {
        const gig = gigs[0];
        expect(gig.id).toBeDefined();
        expect(gig.title).toBeDefined();
        expect(typeof gig.budget_sats).toBe('number');
      }
    });

    test('supports pagination parameters', async ({ request }) => {
      const res = await request.get(`${BASE}/api/gigs?limit=5&offset=0`);
      
      expect(res.status()).toBe(200);
      
      const data = await res.json();
      const gigs = data.gigs || data;
      expect(gigs.length).toBeLessThanOrEqual(5);
    });

    test('supports category filter', async ({ request }) => {
      const res = await request.get(`${BASE}/api/gigs?category=Research%20%26%20Analysis`);
      
      expect(res.status()).toBe(200);
      
      const data = await res.json();
      const gigs = data.gigs || data;
      // All returned gigs should match category (if any returned)
      for (const gig of gigs) {
        expect(gig.category).toBe('Research & Analysis');
      }
    });
  });
});
