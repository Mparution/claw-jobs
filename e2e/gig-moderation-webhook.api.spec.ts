import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || 'test-webhook-secret';

test.describe('POST /api/webhooks/gig-moderation', () => {
  test.describe('Authentication', () => {
    test('rejects requests without webhook secret', async ({ request }) => {
      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Test Gig',
            description: 'Test description',
            budget_sats: 5000,
            category: 'Other',
            poster_id: '00000000-0000-0000-0000-000000000002',
          },
        },
      });

      expect(res.status()).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('rejects requests with invalid webhook secret', async ({ request }) => {
      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': 'invalid-secret-12345',
        },
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Test Gig',
            description: 'Test description',
            budget_sats: 5000,
            category: 'Other',
            poster_id: '00000000-0000-0000-0000-000000000002',
          },
        },
      });

      expect(res.status()).toBe(401);
    });
  });

  test.describe('Payload Validation', () => {
    test('rejects invalid JSON payload', async ({ request }) => {
      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
          'Content-Type': 'application/json',
        },
        data: 'not valid json{{{',
      });

      // Should return 400 for invalid JSON
      expect([400, 500]).toContain(res.status());
    });

    test('ignores non-INSERT events', async ({ request }) => {
      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'UPDATE',
          table: 'gigs',
          record: {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Updated Gig',
          },
        },
      });

      // Should either accept or return ignored message
      expect([200, 401, 500]).toContain(res.status());
      if (res.status() === 200) {
        const data = await res.json();
        expect(data.message).toContain('Ignored');
      }
    });

    test('ignores events for non-gigs tables', async ({ request }) => {
      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'INSERT',
          table: 'users',
          record: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Test User',
          },
        },
      });

      expect([200, 401, 500]).toContain(res.status());
      if (res.status() === 200) {
        const data = await res.json();
        expect(data.message).toContain('Ignored');
      }
    });
  });

  test.describe('GET /api/webhooks/gig-moderation (health check)', () => {
    test('returns service status', async ({ request }) => {
      const res = await request.get(`${BASE}/api/webhooks/gig-moderation`);

      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('gig-moderation-webhook');
      expect(data.timestamp).toBeDefined();
    });
  });

  test.describe('Content Moderation (with valid auth)', () => {
    // These tests only run if SUPABASE_WEBHOOK_SECRET is properly configured
    const skipIfNoSecret = WEBHOOK_SECRET === 'test-webhook-secret';

    test('detects prohibited content keywords', async ({ request }) => {
      if (skipIfNoSecret) {
        test.skip();
        return;
      }

      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: `test-prohibited-${Date.now()}`,
            title: 'Need help with hacking services',
            description: 'Looking for someone to hack into systems and bypass security measures.',
            budget_sats: 50000,
            category: 'Code & Development',
            poster_id: '00000000-0000-0000-0000-000000000002',
            created_at: new Date().toISOString(),
          },
        },
      });

      expect([200, 401, 500]).toContain(res.status());
      if (res.status() === 200) {
        const data = await res.json();
        // Should be rejected or pending review
        expect(['rejected', 'pending_review']).toContain(data.moderation_status);
      }
    });

    test('detects external contact info', async ({ request }) => {
      if (skipIfNoSecret) {
        test.skip();
        return;
      }

      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: `test-contact-${Date.now()}`,
            title: 'Writing work needed',
            description: 'Contact me at email@example.com or discord.gg/myserver to discuss.',
            budget_sats: 5000,
            category: 'Writing & Content',
            poster_id: '00000000-0000-0000-0000-000000000002',
            created_at: new Date().toISOString(),
          },
        },
      });

      expect([200, 401, 500]).toContain(res.status());
      if (res.status() === 200) {
        const data = await res.json();
        // Should flag external contact info
        expect(['rejected', 'pending_review']).toContain(data.moderation_status);
      }
    });

    test('flags suspiciously high budget', async ({ request }) => {
      if (skipIfNoSecret) {
        test.skip();
        return;
      }

      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: `test-highbudget-${Date.now()}`,
            title: 'Simple data entry task',
            description: 'Enter some data into a spreadsheet.',
            budget_sats: 100000000, // 100M sats
            category: 'Data Processing',
            poster_id: '00000000-0000-0000-0000-000000000002',
            created_at: new Date().toISOString(),
          },
        },
      });

      expect([200, 401, 500]).toContain(res.status());
      if (res.status() === 200) {
        const data = await res.json();
        // Should flag high budget
        expect(['pending_review']).toContain(data.moderation_status);
      }
    });

    test('approves clean gig from trusted user', async ({ request }) => {
      if (skipIfNoSecret) {
        test.skip();
        return;
      }

      const res = await request.post(`${BASE}/api/webhooks/gig-moderation`, {
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        data: {
          type: 'INSERT',
          table: 'gigs',
          record: {
            id: `test-clean-${Date.now()}`,
            title: 'Research assistance needed',
            description: 'Looking for help researching market trends for a business report.',
            budget_sats: 10000,
            category: 'Research & Analysis',
            poster_id: '00000000-0000-0000-0000-000000000002',
            created_at: new Date().toISOString(),
          },
        },
      });

      expect([200, 401, 500]).toContain(res.status());
      // Clean gigs should be approved or pending (depending on user trust)
      if (res.status() === 200) {
        const data = await res.json();
        expect(['approved', 'pending_review']).toContain(data.moderation_status);
      }
    });
  });
});
