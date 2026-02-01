/**
 * Claw Jobs API Tests
 * 
 * These tests verify all API routes are working correctly.
 * Run with: npm test
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://claw-jobs.com';

describe('Claw Jobs API', () => {
  
  // ==================== Health & Stats ====================
  
  describe('Health Check', () => {
    it('GET /api/health should return 200', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('Stats', () => {
    it('GET /api/stats should return platform stats', async () => {
      const res = await fetch(`${BASE_URL}/api/stats`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('total_gigs');
      expect(data).toHaveProperty('total_users');
    });
  });

  // ==================== Agent Discovery ====================

  describe('Agent Discovery', () => {
    it('GET /api/skill should return skill.md content', async () => {
      const res = await fetch(`${BASE_URL}/api/skill`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('claw-jobs');
    });

    it('GET /skill.md should return skill.md content', async () => {
      const res = await fetch(`${BASE_URL}/skill.md`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('claw-jobs');
    });

    it('GET /.well-known/agent.json should return agent manifest', async () => {
      const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('capabilities');
    });
  });

  // ==================== Gigs ====================

  describe('Gigs API', () => {
    it('GET /api/gigs should return gig list', async () => {
      const res = await fetch(`${BASE_URL}/api/gigs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/gigs without auth should return 401', async () => {
      const res = await fetch(`${BASE_URL}/api/gigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Gig',
          description: 'Test description',
          category: 'other',
          budget_sats: 1000
        })
      });
      expect(res.status).toBe(401);
    });
  });

  // ==================== Auth ====================

  describe('Auth API', () => {
    it('GET /api/auth/me without auth should return null user', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();
    });

    it('POST /api/auth/signin with wrong creds should fail', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'wrongpassword123'
        })
      });
      expect([400, 401]).toContain(res.status);
    });
  });

  // ==================== Agent Registration ====================

  describe('Agent Registration', () => {
    it('POST /api/agents/register with missing fields should return 400', async () => {
      const res = await fetch(`${BASE_URL}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect([400, 422]).toContain(res.status);
    });
  });

  // ==================== Pages ====================

  describe('Pages', () => {
    it('GET / should return homepage', async () => {
      const res = await fetch(BASE_URL);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Claw Jobs');
    });

    it('GET /gigs should return gigs page', async () => {
      const res = await fetch(`${BASE_URL}/gigs`);
      expect(res.status).toBe(200);
    });

    it('GET /gigs/new should return create gig page', async () => {
      const res = await fetch(`${BASE_URL}/gigs/new`);
      expect(res.status).toBe(200);
    });

    it('GET /dashboard should return dashboard', async () => {
      const res = await fetch(`${BASE_URL}/dashboard`);
      expect(res.status).toBe(200);
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('GET /api/nonexistent should return 404', async () => {
      const res = await fetch(`${BASE_URL}/api/nonexistent`);
      expect(res.status).toBe(404);
    });
  });
});
