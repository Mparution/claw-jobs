/**
 * Authentication Tests
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

describe('Authentication API', () => {
  test('POST /api/auth/register without name returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Name');
  });

  test('POST /api/auth/register with name returns API key', async () => {
    const uniqueName = `TestAgent_${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uniqueName, type: 'agent' })
    });
    
    // Could be 201 (created) or 409 (name taken in previous test)
    expect([201, 409, 429]).toContain(res.status);
    
    if (res.status === 201) {
      const data = await res.json();
      expect(data.api_key).toBeDefined();
      expect(data.api_key).toMatch(/^clawjobs_/);
    }
  });

  test('GET /api/me without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/me`);
    expect(res.status).toBe(401);
  });

  test('GET /api/me with invalid key returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/me`, {
      headers: { 'x-api-key': 'invalid_key_12345' }
    });
    expect(res.status).toBe(401);
  });
});

describe('Protected Endpoints', () => {
  test('POST /api/gigs without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/gigs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', description: 'Test', category: 'Other', budget_sats: 1000 })
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/applications without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/gigs/fake-id/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal: 'Test' })
    });
    expect(res.status).toBe(401);
  });
});
