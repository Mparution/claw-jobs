import { test, expect } from '@playwright/test';
import { registerUser, createGig, applyToGig } from './helpers/fixtures';

test.describe('Authorization & Security', () => {
  test('Cannot approve deliverable for someone else\'s gig', async ({ request }) => {
    const poster = await registerUser(request, { type: 'human' });
    const attacker = await registerUser(request, { type: 'human' });
    const gig = await createGig(request, poster.api_key);

    // Attacker tries to approve with a fake deliverable ID
    const res = await request.post(`/api/gigs/${gig.id}/approve`, {
      headers: { 'x-api-key': attacker.api_key },
      data: { deliverable_id: 'fake-deliverable-id' },
    });

    expect([401, 403, 404]).toContain(res.status());
  });

  test('Cannot accept application on someone else\'s gig', async ({ request }) => {
    const poster = await registerUser(request, { type: 'human' });
    const worker = await registerUser(request, { type: 'agent' });
    const attacker = await registerUser(request, { type: 'human' });

    const gig = await createGig(request, poster.api_key);
    const application = await applyToGig(request, worker.api_key, gig.id);

    // Attacker tries to accept the application
    const res = await request.patch(`/api/applications/${application.application?.id}`, {
      headers: { 'x-api-key': attacker.api_key },
      data: { status: 'accepted' },
    });

    expect([401, 403]).toContain(res.status());
  });

  test('Admin endpoints reject non-admin users', async ({ request }) => {
    const user = await registerUser(request);
    const res = await request.get('/api/admin/moderation', {
      headers: { 'x-api-key': user.api_key },
    });

    // Should be forbidden or not found
    expect([401, 403, 404]).toContain(res.status());
  });

  test('Admin endpoints reject unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/admin/moderation');
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot report your own gig', async ({ request }) => {
    const poster = await registerUser(request);
    const gig = await createGig(request, poster.api_key);

    const res = await request.post(`/api/gigs/${gig.id}/report`, {
      headers: { 'x-api-key': poster.api_key },
      data: { reason: 'spam' },
    });

    // Should be rejected (400) or endpoint may not exist (404)
    expect([400, 404]).toContain(res.status());
  });

  test('Security headers are present', async ({ request }) => {
    const res = await request.get('/api/health');
    const headers = res.headers();

    // Check key security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    
    // These might vary based on middleware config
    if (headers['referrer-policy']) {
      expect(headers['referrer-policy']).toContain('origin');
    }
    if (headers['content-security-policy']) {
      expect(headers['content-security-policy']).toContain('self');
    }
  });

  test('Rate limiting returns 429 on excessive requests', async ({ request }) => {
    // Hit feedback endpoint rapidly (limit: 5/hour)
    const results: number[] = [];

    for (let i = 0; i < 10; i++) {
      const res = await request.post('/api/feedback', {
        data: {
          from: 'RateLimitTest',
          message: `Test feedback message number ${i} for rate limit testing - must be long enough`,
        },
      });
      results.push(res.status());
    }

    // At least one should be 429 (rate limited)
    expect(results).toContain(429);
  });

  test('Cannot access other user profile details via API', async ({ request }) => {
    const user1 = await registerUser(request);
    const user2 = await registerUser(request);

    // Try to access user2's sensitive data using user1's key
    // This tests that users can't enumerate other users' API keys/hashes
    const res = await request.get(`/api/users/${user2.id}`, {
      headers: { 'x-api-key': user1.api_key },
    });

    if (res.ok()) {
      const data = await res.json();
      // Ensure sensitive fields are not exposed
      expect(data.api_key).toBeUndefined();
      expect(data.api_key_hash).toBeUndefined();
      expect(data.password_hash).toBeUndefined();
    }
  });

  test('SQL injection attempt is rejected', async ({ request }) => {
    const user = await registerUser(request);

    // Try SQL injection in gig title
    const res = await request.post('/api/gigs', {
      headers: { 'x-api-key': user.api_key },
      data: {
        title: "Test'; DROP TABLE users; --",
        description: 'Legitimate description for testing',
        budget_sats: 1000,
        category: 'other',
      },
    });

    // Should either sanitize or reject, but not execute SQL
    // The response should not indicate a server error from failed SQL
    expect(res.status()).toBeLessThan(500);
  });
});
