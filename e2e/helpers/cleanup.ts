import { APIRequestContext } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Track created test data for cleanup
export interface TestData {
  users: { id: string; api_key: string }[];
  gigs: { id: string; poster_api_key: string }[];
  webhooks: { id: string; owner_api_key: string }[];
}

export const testData: TestData = {
  users: [],
  gigs: [],
  webhooks: [],
};

/**
 * Track a created user for cleanup
 */
export function trackUser(id: string, api_key: string) {
  testData.users.push({ id, api_key });
}

/**
 * Track a created gig for cleanup  
 */
export function trackGig(id: string, poster_api_key: string) {
  testData.gigs.push({ id, poster_api_key });
}

/**
 * Track a created webhook for cleanup
 */
export function trackWebhook(id: string, owner_api_key: string) {
  testData.webhooks.push({ id, owner_api_key });
}

/**
 * Clean up all tracked test data.
 * Call this in afterAll hook.
 */
export async function cleanupTestData(request: APIRequestContext) {
  const errors: string[] = [];

  // Delete webhooks first (they reference users)
  for (const webhook of testData.webhooks) {
    try {
      await request.delete(`${BASE}/api/webhooks?id=${webhook.id}`, {
        headers: { 'x-api-key': webhook.owner_api_key },
      });
    } catch (e) {
      errors.push(`Failed to delete webhook ${webhook.id}: ${e}`);
    }
  }

  // Delete gigs (they reference users)
  for (const gig of testData.gigs) {
    try {
      await request.delete(`${BASE}/api/gigs/${gig.id}`, {
        headers: { 'x-api-key': gig.poster_api_key },
      });
    } catch (e) {
      // Gigs might not have delete endpoint, try soft-delete
      try {
        await request.patch(`${BASE}/api/gigs/${gig.id}`, {
          headers: { 'x-api-key': gig.poster_api_key },
          data: { status: 'cancelled', _test_cleanup: true },
        });
      } catch {
        errors.push(`Failed to cleanup gig ${gig.id}: ${e}`);
      }
    }
  }

  // Delete users last
  for (const user of testData.users) {
    try {
      // Try the delete account endpoint
      await request.delete(`${BASE}/api/me`, {
        headers: { 'x-api-key': user.api_key },
      });
    } catch (e) {
      // Alternative: mark for deletion via admin endpoint
      try {
        await request.post(`${BASE}/api/auth/deactivate`, {
          headers: { 'x-api-key': user.api_key },
          data: { _test_cleanup: true },
        });
      } catch {
        errors.push(`Failed to delete user ${user.id}: ${e}`);
      }
    }
  }

  // Clear tracking arrays
  testData.users = [];
  testData.gigs = [];
  testData.webhooks = [];

  if (errors.length > 0) {
    console.warn('Test cleanup errors:', errors);
  }
}

/**
 * Reset tracking (call at start of test suite)
 */
export function resetTracking() {
  testData.users = [];
  testData.gigs = [];
  testData.webhooks = [];
}
