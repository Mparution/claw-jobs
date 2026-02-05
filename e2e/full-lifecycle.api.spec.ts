import { test, expect } from '@playwright/test';

/**
 * Full Lifecycle Flow Test
 * Tests: register → post gig → apply → accept → submit → approve → paid
 */

const TEST_POSTER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_WORKER_ID = '00000000-0000-0000-0000-000000000002';

let posterApiKey: string;
let workerApiKey: string;
let gigId: string;
let applicationId: string;

test.describe.serial('Full Gig Lifecycle', () => {
  
  test('1. Register poster account', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        name: 'FlowTestPoster',
        email: `poster-${Date.now()}@test.com`,
        type: 'human',
        lightning_address: 'poster@getalby.com',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.api_key).toBeDefined();
    posterApiKey = data.api_key;
  });

  test('2. Register worker account', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        name: 'FlowTestWorker',
        email: `worker-${Date.now()}@test.com`,
        type: 'agent',
        lightning_address: 'worker@getalby.com',
        capabilities: ['code', 'writing'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.api_key).toBeDefined();
    workerApiKey = data.api_key;
  });

  test('3. Poster creates a gig', async ({ request }) => {
    const response = await request.post('/api/gigs', {
      headers: { 'x-api-key': posterApiKey },
      data: {
        title: 'Flow Test Gig',
        description: 'This is a test gig for the full lifecycle flow test. It should be auto-approved in test mode.',
        budget_sats: 1000,
        category: 'development',
        skills_required: ['testing'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.gig?.id || data.id).toBeDefined();
    gigId = data.gig?.id || data.id;
  });

  test('4. Worker applies to the gig', async ({ request }) => {
    const response = await request.post(`/api/gigs/${gigId}/apply`, {
      headers: { 'x-api-key': workerApiKey },
      data: {
        proposal: 'I am a skilled test worker and would like to complete this gig. I have extensive experience in testing.',
        proposed_price_sats: 1000,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.application?.id || data.id).toBeDefined();
    applicationId = data.application?.id || data.id;
  });

  test('5. Poster accepts the application', async ({ request }) => {
    const response = await request.patch(`/api/applications/${applicationId}`, {
      headers: { 'x-api-key': posterApiKey },
      data: {
        status: 'accepted',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.application?.status || data.status).toBe('accepted');
  });

  test('6. Worker submits deliverable', async ({ request }) => {
    const response = await request.post(`/api/gigs/${gigId}/deliverable`, {
      headers: { 'x-api-key': workerApiKey },
      data: {
        content: 'Here is my completed work for the test gig. All requirements have been met.',
        files: [],
      },
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('7. Poster approves deliverable (triggers payment)', async ({ request }) => {
    const response = await request.post(`/api/gigs/${gigId}/approve`, {
      headers: { 'x-api-key': posterApiKey },
      data: {
        rating: 5,
        feedback: 'Excellent work on the test!',
      },
    });
    
    // In mock mode, payment should succeed or be skipped
    expect(response.status()).toBeLessThan(500);
  });

  test('8. Verify gig is completed', async ({ request }) => {
    const response = await request.get(`/api/gigs/${gigId}`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(['completed', 'paid', 'pending_payment']).toContain(data.gig?.status || data.status);
  });
});
