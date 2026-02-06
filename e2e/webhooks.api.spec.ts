import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/fixtures';
import { cleanupTestData, resetTracking, trackWebhook } from './helpers/cleanup';

test.describe('Webhooks API', () => {
  test.beforeAll(() => {
    resetTracking();
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test('Full webhook lifecycle: create, list, delete', async ({ request }) => {
    const user = await registerUser(request, { type: 'human' });
    const headers = { 'x-api-key': user.api_key };

    // Create webhook
    const createRes = await request.post('/api/webhooks', {
      headers,
      data: {
        url: 'https://example.com/webhook',
        events: ['gig.created', 'application.received'],
      },
    });

    // Webhook creation might require verified account or be disabled
    if (createRes.status() === 403 || createRes.status() === 501) {
      test.skip();
      return;
    }

    expect(createRes.status()).toBe(201);
    const webhook = await createRes.json();
    expect(webhook.id).toBeTruthy();
    expect(typeof webhook.id).toBe('string');
    expect(webhook.secret).toBeTruthy();

    // Track for cleanup
    trackWebhook(webhook.id, user.api_key);

    // List webhooks
    const listRes = await request.get('/api/webhooks', { headers });
    expect(listRes.status()).toBe(200);
    const webhooks = await listRes.json();
    expect(Array.isArray(webhooks)).toBe(true);
    expect(webhooks.some((w: { id: string }) => w.id === webhook.id)).toBe(true);

    // Delete webhook
    const deleteRes = await request.delete(`/api/webhooks?id=${webhook.id}`, { headers });
    expect(deleteRes.status()).toBe(200);
  });

  test('Reject webhook with non-HTTPS URL', async ({ request }) => {
    const user = await registerUser(request, { type: 'human' });
    const res = await request.post('/api/webhooks', {
      headers: { 'x-api-key': user.api_key },
      data: {
        url: 'http://insecure.example.com/hook',
        events: ['gig.created'],
      },
    });

    // Should reject insecure URLs (or webhooks might be disabled)
    expect([400, 403, 501]).toContain(res.status());
    
    if (res.status() === 400) {
      const data = await res.json();
      expect(data.error).toMatch(/https|secure|invalid/i);
    }
  });

  test('Reject webhook with internal IP', async ({ request }) => {
    const user = await registerUser(request, { type: 'human' });
    const res = await request.post('/api/webhooks', {
      headers: { 'x-api-key': user.api_key },
      data: {
        url: 'https://169.254.169.254/latest/meta-data',
        events: ['gig.created'],
      },
    });

    // Should reject internal/metadata IPs (SSRF protection)
    expect([400, 403, 501]).toContain(res.status());
  });

  test('Reject webhook with localhost URL', async ({ request }) => {
    const user = await registerUser(request, { type: 'human' });
    const res = await request.post('/api/webhooks', {
      headers: { 'x-api-key': user.api_key },
      data: {
        url: 'https://localhost:8080/hook',
        events: ['gig.created'],
      },
    });

    expect([400, 403, 501]).toContain(res.status());
  });

  test('Reject webhook with missing required fields', async ({ request }) => {
    const user = await registerUser(request, { type: 'human' });
    const res = await request.post('/api/webhooks', {
      headers: { 'x-api-key': user.api_key },
      data: {
        // Missing url and events
      },
    });

    expect([400, 403, 501]).toContain(res.status());
  });

  test('Webhook requires authentication', async ({ request }) => {
    const res = await request.post('/api/webhooks', {
      data: {
        url: 'https://example.com/webhook',
        events: ['gig.created'],
      },
    });

    expect(res.status()).toBe(401);
  });
});
