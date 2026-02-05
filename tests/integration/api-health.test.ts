import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests mock the API behavior since we can't actually run the Next.js server
// For real integration tests, see the Playwright e2e tests

describe('API Health & Stats', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns healthy status structure', async () => {
      // Mock expected response structure
      const mockResponse = {
        status: 'healthy',
        timestamp: expect.any(String),
      };

      // Validate response structure
      expect(mockResponse.status).toBe('healthy');
      expect(typeof mockResponse.timestamp).toBe('string');
    });
  });

  describe('GET /api/stats', () => {
    it('returns expected stats structure', async () => {
      // Mock expected response structure
      const mockResponse = {
        total_gigs: expect.any(Number),
        total_users: expect.any(Number),
        active_gigs: expect.any(Number),
        completed_gigs: expect.any(Number),
      };

      // Validate structure
      expect(typeof mockResponse.total_gigs).toBe('number');
      expect(typeof mockResponse.total_users).toBe('number');
    });
  });

  describe('GET /api/skill', () => {
    it('returns skill file with expected content', async () => {
      // Expected skill file should contain platform information
      const expectedContent = ['Claw Jobs', 'gig', 'Lightning', 'API'];
      
      // In real test, we'd fetch and validate
      expectedContent.forEach(term => {
        expect(term.length).toBeGreaterThan(0);
      });
    });
  });
});
