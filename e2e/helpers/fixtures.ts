import { APIRequestContext } from '@playwright/test';
import { trackUser, trackGig } from './cleanup';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  api_key: string;
  type: 'human' | 'agent';
}

/**
 * Register a fresh test user via the API and return their credentials.
 * Automatically tracks user for cleanup.
 */
export async function registerUser(
  request: APIRequestContext,
  overrides: { name?: string; type?: string } = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  const name = overrides.name || `E2ETest_${timestamp}_${random}`;
  const type = overrides.type || 'agent';

  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      name,
      type,
      lightning_address: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@getalby.com`,
    },
  });

  if (res.status() !== 200 && res.status() !== 201) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Registration failed (${res.status()}): ${JSON.stringify(body)}`);
  }

  const data = await res.json();
  const user = {
    id: data.user_id || data.user?.id,
    name: data.user?.name || name,
    email: data.user?.email || `${name.toLowerCase()}@test.com`,
    api_key: data.api_key,
    type: (data.user?.type || type) as 'human' | 'agent',
  };

  // Track for cleanup
  trackUser(user.id, user.api_key);

  return user;
}

/**
 * Create a gig as the given user. Returns the gig object.
 * Automatically tracks gig for cleanup.
 */
export async function createGig(
  request: APIRequestContext,
  apiKey: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post(`${BASE}/api/gigs`, {
    headers: { 'x-api-key': apiKey },
    data: {
      title: overrides.title || `E2E Test Gig ${Date.now()}`,
      description: overrides.description || 'This is a test gig created by E2E tests. Please read and provide a summary.',
      category: overrides.category || 'Research & Analysis',
      budget_sats: overrides.budget_sats || 5000,
      skills_required: overrides.skills_required || ['research', 'writing'],
      deadline: overrides.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_testnet: true, // Always use testnet for E2E tests
      ...overrides,
    },
  });

  const data = await res.json();
  const gigId = data.gig?.id || data.id;

  // Track for cleanup if created successfully
  if (gigId && (res.status() === 200 || res.status() === 201)) {
    trackGig(gigId, apiKey);
  }

  return { status: res.status(), id: gigId, ...data };
}

/**
 * Apply to a gig as the given user.
 */
export async function applyToGig(
  request: APIRequestContext,
  apiKey: string,
  gigId: string,
  proposal?: string
) {
  const res = await request.post(`${BASE}/api/gigs/${gigId}/apply`, {
    headers: { 'x-api-key': apiKey },
    data: {
      proposal: proposal || 'I have extensive experience and can deliver high-quality results.',
      proposed_price_sats: 5000,
    },
  });

  const data = await res.json();
  return { status: res.status(), application: data.application || data, ...data };
}

/**
 * Accept an application (as the gig poster).
 */
export async function acceptApplication(
  request: APIRequestContext,
  apiKey: string,
  applicationId: string
) {
  const res = await request.patch(`${BASE}/api/applications/${applicationId}`, {
    headers: { 'x-api-key': apiKey },
    data: { status: 'accepted' },
  });

  const data = await res.json();
  return { status: res.status(), success: data.success ?? res.ok(), ...data };
}

/**
 * Submit a deliverable (as the worker).
 */
export async function submitDeliverable(
  request: APIRequestContext,
  apiKey: string,
  gigId: string,
  content?: string
) {
  const res = await request.post(`${BASE}/api/gigs/${gigId}/deliverable`, {
    headers: { 'x-api-key': apiKey },
    data: {
      content: content || 'Here is the completed work. The document has been summarized as requested.',
    },
  });

  const data = await res.json();
  return { 
    status: res.status(), 
    deliverable_id: data.deliverable_id || data.deliverable?.id || data.id,
    ...data 
  };
}

/**
 * Approve a deliverable and trigger payment (as the poster).
 */
export async function approveDeliverable(
  request: APIRequestContext,
  apiKey: string,
  gigId: string,
  deliverableId?: string
) {
  const res = await request.post(`${BASE}/api/gigs/${gigId}/approve`, {
    headers: { 'x-api-key': apiKey },
    data: deliverableId ? { deliverable_id: deliverableId } : {},
  });

  const data = await res.json();
  return { status: res.status(), ...data };
}

/**
 * Get gig details by ID.
 */
export async function getGig(request: APIRequestContext, gigId: string) {
  const res = await request.get(`${BASE}/api/gigs/${gigId}`);
  const data = await res.json();
  return { status: res.status(), gig: data.gig || data, ...data };
}

/**
 * Get user profile.
 */
export async function getProfile(request: APIRequestContext, apiKey: string) {
  const res = await request.get(`${BASE}/api/me`, {
    headers: { 'x-api-key': apiKey },
  });
  const data = await res.json();
  return { status: res.status(), ...data };
}

/**
 * List open gigs.
 */
export async function listGigs(request: APIRequestContext, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await request.get(`${BASE}/api/gigs${query}`);
  const data = await res.json();
  return { status: res.status(), gigs: data.gigs || data, ...data };
}
