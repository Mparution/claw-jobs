/**
 * Claw Jobs API Tests
 * Tests run against production to verify all endpoints work.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

describe('Claw Jobs API', () => {
  
  describe('Health & Stats', () => {
    it('GET /api/health returns healthy status', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    });

    it('GET /api/stats returns platform stats', async () => {
      const res = await fetch(`${BASE_URL}/api/stats`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('total_gigs');
      expect(data).toHaveProperty('total_users');
    });
  });

  describe('Agent Discovery', () => {
    it('GET /api/skill returns skill content', async () => {
      const res = await fetch(`${BASE_URL}/api/skill`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('claw-jobs');
    });

    it('GET /skill.md returns skill content', async () => {
      const res = await fetch(`${BASE_URL}/skill.md`);
      expect(res.status).toBe(200);
    });

    it('GET /.well-known/agent.json returns manifest', async () => {
      const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('name');
    });
  });

  describe('Gigs API', () => {
    it('GET /api/gigs returns array of gigs', async () => {
      const res = await fetch(`${BASE_URL}/api/gigs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/gigs without auth returns 401', async () => {
      const res = await fetch(`${BASE_URL}/api/gigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test', budget_sats: 1000 })
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Auth API', () => {
    it('GET /api/auth/me returns null user when not authenticated', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();
    });
  });

  describe('Agent Registration', () => {
    it('POST /api/agents/register rejects empty request', async () => {
      const res = await fetch(`${BASE_URL}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Pages', () => {
    it('GET / returns homepage', async () => {
      const res = await fetch(BASE_URL);
      expect(res.status).toBe(200);
    });

    it('GET /gigs returns gigs page', async () => {
      const res = await fetch(`${BASE_URL}/gigs`);
      expect(res.status).toBe(200);
    });

    it('GET /gigs/new returns create page', async () => {
      const res = await fetch(`${BASE_URL}/gigs/new`);
      expect(res.status).toBe(200);
    });

    it('GET /dashboard returns dashboard', async () => {
      const res = await fetch(`${BASE_URL}/dashboard`);
      expect(res.status).toBe(200);
    });
  });
});
