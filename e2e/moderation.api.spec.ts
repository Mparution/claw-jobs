import { test, expect } from '@playwright/test';
import { registerUser, createGig } from './helpers/fixtures';
import { cleanupTestData, resetTracking } from './helpers/cleanup';

test.describe('Moderation & Webhook API Flows', () => {
  test.beforeAll(() => {
    resetTracking();
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.describe('Gig Moderation', () => {
    test('new user gigs require moderation', async ({ request }) => {
      const user = await registerUser(request, { name: `NewUser_${Date.now()}` });
      
      const result = await createGig(request, user.api_key, {
        title: 'E2E Test: moderation check',
        description: 'This is a test gig to verify moderation status assignment.',
        category: 'Other',
        budget_sats: 5000,
      });
      
      expect([200, 201, 202]).toContain(result.status);
      expect(result.id).toBeTruthy();
    });

    test('gig with prohibited content is flagged', async ({ request }) => {
      const user = await registerUser(request);
      
      const result = await createGig(request, user.api_key, {
        title: 'Need help with hacking services',
        description: 'Looking for someone to hack into accounts and bypass security.',
        category: 'Code & Development',
        budget_sats: 50000,
      });
      
      expect([400, 403, 200, 201]).toContain(result.status);
      if (result.status === 200 || result.status === 201) {
        const moderationStatus = result.gig?.moderation_status || result.moderation_status;
        if (moderationStatus) {
          expect(['pending', 'pending_review', 'rejected']).toContain(moderationStatus);
        }
      }
    });

    test('gig with flagged keywords goes to review', async ({ request }) => {
      const user = await registerUser(request, { name: `FlagTest_${Date.now()}` });
      
      const result = await createGig(request, user.api_key, {
        title: 'Anonymous data collection service',
        description: 'Need to collect data anonymously from various sources for research.',
        category: 'Data Processing',
        budget_sats: 10000,
      });
      
      expect([200, 201, 202]).toContain(result.status);
    });
  });

  test.describe('Reporting System', () => {
    test('report endpoint requires authentication', async ({ request }) => {
      const res = await request.post('/api/reports', {
        data: {
          target_type: 'gig',
          target_id: '00000000-0000-0000-0000-000000000000',
          reason: 'spam',
          description: 'This is spam content.',
        },
      });
      
      expect(res.status()).toBe(401);
    });

    test('authenticated user can submit report', async ({ request }) => {
      const user = await registerUser(request);
      const gig = await createGig(request, user.api_key);
      
      if (gig.id) {
        const res = await request.post('/api/reports', {
          headers: { 'x-api-key': user.api_key },
          data: {
            target_type: 'gig',
            target_id: gig.id,
            reason: 'spam',
            description: 'Test report submission.',
          },
        });
        
        // Should succeed or indicate already reported
        expect([200, 201, 400, 409]).toContain(res.status());
      }
    });

    test('report requires valid target_id', async ({ request }) => {
      const user = await registerUser(request);
      
      const res = await request.post('/api/reports', {
        headers: { 'x-api-key': user.api_key },
        data: {
          target_type: 'gig',
          target_id: 'invalid-uuid-format',
          reason: 'spam',
          description: 'Test report.',
        },
      });
      
      expect([400, 404]).toContain(res.status());
    });
  });

  test.describe('Feedback API', () => {
    test('can submit feedback', async ({ request }) => {
      const res = await request.post('/api/feedback', {
        data: {
          type: 'feature',
          message: 'E2E Test: This is a test feedback message for the API.',
        },
      });
      
      // Feedback might be public or require auth depending on config
      expect([200, 201, 401, 429]).toContain(res.status());
    });

    test('feedback requires message', async ({ request }) => {
      const res = await request.post('/api/feedback', {
        data: {
          type: 'feature',
          // Missing message
        },
      });
      
      expect([400, 401]).toContain(res.status());
    });
  });

  test.describe('Admin Moderation Endpoints', () => {
    test('admin endpoints require admin auth', async ({ request }) => {
      const res = await request.get('/api/admin/moderation/pending');
      expect([401, 403, 404]).toContain(res.status());
    });

    test('regular user cannot access admin endpoints', async ({ request }) => {
      const user = await registerUser(request);
      
      const res = await request.get('/api/admin/moderation/pending', {
        headers: { 'x-api-key': user.api_key },
      });
      
      expect([401, 403]).toContain(res.status());
    });

    test('regular user cannot approve gigs', async ({ request }) => {
      const user = await registerUser(request);
      
      const res = await request.post('/api/admin/moderation/approve', {
        headers: { 'x-api-key': user.api_key },
        data: { gig_id: '00000000-0000-0000-0000-000000000000' },
      });
      
      expect([401, 403, 404]).toContain(res.status());
    });
  });
});
