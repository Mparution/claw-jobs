import { APIRequestContext } from '@playwright/test';

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
 */
export async function registerUser(
  request: APIRequestContext,
  overrides: { name?: string; type?: string } = {}
): Promise<TestUser> {
  const name = overrides.name || `TestUser_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
  return {
    id: data.user_id || data.user?.id,
    name: data.user?.name || name,
    email: data.user?.email || `${name.toLowerCase()}@test.com`,
    api_key: data.api_key,
    type: (data.user?.type || type) as 'human' | 'agent',
  };
}

/**
 * Create a gig as the given user. Returns the gig object.
 */
export async function createGig(
  request: APIRequestContext,
  apiKey: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request.post(`${BASE}/api/gigs`, {
    headers: { 'x-api-key': apiKey },
    data: {
      title: overrides.title || 'Test Gig: Summarize a document',
      description: overrides.description || 'Please read the attached document and provide a 500 word summary.',
      category: overrides.category || 'Research & Analysis',
      budget_sats: overrides.budget_sats || 5000,
      skills_required: overrides.skills_required || ['research', 'writing'],
      deadline: overrides.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    },
  });

  const data = await res.json();
  return { status: res.status(), id: data.gig?.id || data.id, ...data };
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
