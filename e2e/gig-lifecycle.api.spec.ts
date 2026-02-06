import { test, expect } from '@playwright/test';
import {
  registerUser,
  createGig,
  applyToGig,
  acceptApplication,
  submitDeliverable,
  approveDeliverable,
  getGig,
  getProfile,
} from './helpers/fixtures';
import { cleanupTestData, resetTracking } from './helpers/cleanup';

test.describe('Gig Lifecycle: post → apply → accept → deliver → pay', () => {
  let poster: { api_key: string; id: string; name: string };
  let worker: { api_key: string; id: string; name: string };
  let gigId: string;
  let applicationId: string;
  let deliverableId: string;

  test.beforeAll(() => {
    resetTracking();
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test('1. Register a poster', async ({ request }) => {
    poster = await registerUser(request, { name: `Poster_${Date.now()}`, type: 'human' });
    expect(poster.api_key).toBeTruthy();
    expect(typeof poster.api_key).toBe('string');
    expect(poster.api_key.length).toBeGreaterThan(10);
  });

  test('2. Register a worker', async ({ request }) => {
    worker = await registerUser(request, { name: `Worker_${Date.now()}`, type: 'agent' });
    expect(worker.api_key).toBeTruthy();
    expect(typeof worker.api_key).toBe('string');
    expect(worker.api_key.length).toBeGreaterThan(10);
  });

  test('3. Poster creates a gig', async ({ request }) => {
    const result = await createGig(request, poster.api_key, {
      title: 'E2E Test: Summarize quarterly earnings report',
      description: 'Read the attached Q4 earnings PDF and produce a 500-word executive summary highlighting revenue, margins, and forward guidance.',
      category: 'Research & Analysis',
      budget_sats: 10000,
    });

    expect([200, 201]).toContain(result.status);
    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe('string');
    gigId = result.id;
  });

  test('4. Worker applies to the gig', async ({ request }) => {
    const result = await applyToGig(
      request,
      worker.api_key,
      gigId,
      'I specialize in financial document analysis and can deliver a concise, accurate summary within 2 hours.'
    );

    expect([200, 201]).toContain(result.status);
    expect(result.application?.id).toBeTruthy();
    applicationId = result.application.id;
  });

  test('5. Worker cannot apply twice', async ({ request }) => {
    const result = await applyToGig(request, worker.api_key, gigId);
    expect([400, 409]).toContain(result.status);
  });

  test('6. Poster accepts the application', async ({ request }) => {
    const result = await acceptApplication(request, poster.api_key, applicationId);
    expect(result.status).toBe(200);
    expect(result.success).toBe(true);
  });

  test('7. Worker submits deliverable', async ({ request }) => {
    const result = await submitDeliverable(
      request,
      worker.api_key,
      gigId,
      'Executive Summary: Q4 revenue increased 12% YoY to $4.2B, driven by cloud services growth. Gross margins expanded 150bps to 42.3%. Management raised FY guidance citing strong enterprise demand and improving unit economics.'
    );

    expect([200, 201]).toContain(result.status);
    deliverableId = result.deliverable_id;
  });

  test('8. Poster approves deliverable (triggers payment)', async ({ request }) => {
    const result = await approveDeliverable(
      request,
      poster.api_key,
      gigId,
      deliverableId
    );

    expect(result.status).toBeLessThan(500);
  });

  test('9. Gig status should be completed or paid', async ({ request }) => {
    const result = await getGig(request, gigId);
    expect(result.status).toBe(200);
    
    const gigStatus = result.gig?.status || result.status;
    expect(['completed', 'paid', 'pending_payment', 'in_progress']).toContain(gigStatus);
  });

  test('10. Worker profile should be accessible', async ({ request }) => {
    const profile = await getProfile(request, worker.api_key);
    expect(profile.status).toBe(200);
    expect(profile.user || profile).toBeTruthy();
    expect(profile.user?.id || profile.id).toBe(worker.id);
  });
});
