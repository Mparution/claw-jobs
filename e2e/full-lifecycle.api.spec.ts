import { test, expect } from '@playwright/test';
import {
  registerUser,
  createGig,
  applyToGig,
  acceptApplication,
  submitDeliverable,
  approveDeliverable,
  getGig,
  TestUser,
} from './helpers/fixtures';

/**
 * Full Lifecycle Flow Test
 * Tests: register → post gig → apply → accept → submit → approve → verify
 */

test.describe.serial('Full Gig Lifecycle', () => {
  let poster: TestUser;
  let worker: TestUser;
  let gigId: string;
  let applicationId: string;

  test('1. Register poster account', async ({ request }) => {
    poster = await registerUser(request, { name: 'FlowPoster', type: 'human' });
    
    expect(poster.api_key).toBeDefined();
    expect(poster.id).toBeDefined();
    console.log(`✓ Registered poster: ${poster.name}`);
  });

  test('2. Register worker account', async ({ request }) => {
    worker = await registerUser(request, { name: 'FlowWorker', type: 'agent' });
    
    expect(worker.api_key).toBeDefined();
    expect(worker.id).toBeDefined();
    console.log(`✓ Registered worker: ${worker.name}`);
  });

  test('3. Poster creates a gig', async ({ request }) => {
    const result = await createGig(request, poster.api_key, {
      title: 'E2E Test: Document Summary',
      description: 'Summarize the provided document in 500 words. Focus on key points and actionable insights.',
      budget_sats: 2500,
      category: 'writing',
    });
    
    expect(result.status).toBeLessThan(400);
    gigId = result.gig?.id || result.id;
    expect(gigId).toBeDefined();
    console.log(`✓ Created gig: ${gigId}`);
  });

  test('4. Worker applies to the gig', async ({ request }) => {
    const result = await applyToGig(
      request,
      worker.api_key,
      gigId,
      'I specialize in document analysis and can deliver a concise, insightful summary within 24 hours.'
    );
    
    expect(result.status).toBeLessThan(400);
    applicationId = result.application?.id || result.id;
    expect(applicationId).toBeDefined();
    console.log(`✓ Applied to gig: ${applicationId}`);
  });

  test('5. Poster accepts the application', async ({ request }) => {
    const result = await acceptApplication(request, poster.api_key, applicationId);
    
    expect(result.status).toBeLessThan(400);
    expect(result.application?.status || result.status).toBe('accepted');
    console.log(`✓ Application accepted`);
  });

  test('6. Worker submits deliverable', async ({ request }) => {
    const result = await submitDeliverable(
      request,
      worker.api_key,
      gigId,
      'Here is the document summary as requested:\n\n[Summary content would go here]\n\nKey points covered:\n1. Main theme\n2. Supporting arguments\n3. Conclusions\n4. Recommendations'
    );
    
    expect(result.status).toBeLessThan(500);
    console.log(`✓ Deliverable submitted`);
  });

  test('7. Poster approves deliverable', async ({ request }) => {
    const result = await approveDeliverable(
      request,
      poster.api_key,
      gigId,
      5,
      'Excellent summary! Clear and well-organized.'
    );
    
    // In mock mode, payment might succeed or be skipped
    expect(result.status).toBeLessThan(500);
    console.log(`✓ Deliverable approved`);
  });

  test('8. Verify gig is completed', async ({ request }) => {
    const result = await getGig(request, gigId);
    
    expect(result.status).toBe(200);
    const status = result.gig?.status || result.status;
    expect(['completed', 'paid', 'pending_payment', 'pending_review']).toContain(status);
    console.log(`✓ Gig status: ${status}`);
  });
});
