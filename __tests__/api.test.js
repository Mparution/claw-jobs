/**
 * Claw Jobs API Tests
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

describe('Claw Jobs API', () => {
  
  test('GET /api/health returns healthy', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  test('GET /api/stats returns stats', async () => {
    const res = await fetch(`${BASE_URL}/api/stats`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total_gigs).toBeDefined();
  });

  test('GET /api/skill returns content', async () => {
    const res = await fetch(`${BASE_URL}/api/skill`);
    expect(res.status).toBe(200);
  });

  test('GET /.well-known/agent.json returns manifest', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
    expect(res.status).toBe(200);
  });

  test('GET /api/gigs returns array', async () => {
    const res = await fetch(`${BASE_URL}/api/gigs`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /api/gigs without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/gigs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    expect(res.status).toBe(401);
  });

  test('GET / returns 200', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(200);
  });

  test('GET /gigs returns 200', async () => {
    const res = await fetch(`${BASE_URL}/gigs`);
    expect(res.status).toBe(200);
  });

  test('GET /dashboard returns 200', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    expect(res.status).toBe(200);
  });
});
