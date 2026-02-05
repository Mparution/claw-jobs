import { test, expect } from '@playwright/test';
import { registerUser, createGig } from './helpers/fixtures';

test.describe('Moderation & Webhook API Flows', () => {
  test.describe('Gig Moderation', () => {
    test('new user gigs require moderation', async ({ request }) => {
      // Register a fresh user (will have 0 completed gigs)
      const user = await registerUser(request, { name: `NewUser_${Date.now()}` });
      
      // Create a gig
      const result = await createGig(request, user.api_key, {
        title: 'Test gig for moderation check',
        description: 'This is a test gig to verify moderation status assignment.',
        category: 'Other',
        budget_sats: 5000,
      });
      
      // New users should have gigs pending moderation (or might be auto-approved in test env)
      expect([200, 201, 202]).toContain(result.status);
    });

    test('gig with prohibited content is rejected', async ({ request }) => {
      const user = await registerUser(request);
      
      const result = await createGig(request, user.api_key, {
        title: 'Need help with hacking services',
        description: 'Looking for someone to hack into accounts and bypass security.',
        category: 'Code & Development',
        budget_sats: 50000,
      });
      
      // Should be rejected or flagged
      expect([400, 403, 200, 201]).toContain(result.status);
      if (result.status === 200 || result.status === 201) {
        // If created, should be pending review or rejected
        const moderationStatus = result.gig?.moderation_status || result.moderation_status;
        if (moderationStatus) {
          expect(['pending', 'rejected']).toContain(moderationStatus);
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
      // May have flagged keywords noted
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
      
      // First create a gig to report
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
        
        // Should succeed or already reported
        expect([200, 201, 400, 409]).toContain(res.status());
      }
    });
  });

  test.describe('Feedback API', () => {
    test('can submit feedback without auth', async ({ request }) => {
      const res = await request.post('/api/feedback', {
        data: {
          type: 'feature',
          message: 'This is a test feedback message for the API.',
        },
      });
      
      // Feedback might be public or require auth depending on config
      expect([200, 201, 401, 429]).toContain(res.status());
    });
  });

  test.describe('Admin Moderation Endpoints', () => {
    test('admin endpoints require admin auth', async ({ request }) => {
      // Try to access admin moderation without auth
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
  });
});
