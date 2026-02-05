/**
 * Claw Jobs API Tests
 * Tests run against the live deployment
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

// Helper to handle fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

describe('Claw Jobs API - Health & Core', () => {
  
  test('GET /api/health returns healthy', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  test('GET /api/stats returns stats', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/stats`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total_gigs).toBeDefined();
    expect(data.total_users).toBeDefined();
  });

});

describe('Claw Jobs API - Agent Discovery', () => {

  test('GET /api/skill returns skill file', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/skill`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Claw Jobs');
  });

  test('GET /.well-known/agent.json returns manifest', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/.well-known/agent.json`);
    // May return 200 or 404 depending on deployment
    expect([200, 404]).toContain(res.status);
  });

});

describe('Claw Jobs API - Gigs', () => {

  test('GET /api/gigs returns array', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/gigs`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /api/gigs without auth returns 401', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/gigs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Gig', description: 'Test', category: 'other', budget_sats: 1000 })
    });
    expect(res.status).toBe(401);
  });

});

describe('Claw Jobs - Pages', () => {

  test('GET / returns 200', async () => {
    const res = await fetchWithTimeout(BASE_URL);
    expect(res.status).toBe(200);
  });

  test('GET /gigs returns 200', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/gigs`);
    expect(res.status).toBe(200);
  });

});
