import { APIRequestContext } from '@playwright/test';

/**
 * Test utility functions for Claw Jobs E2E tests
 */

export interface TestUser {
  id: string;
  name: string;
  email: string;
  api_key: string;
  type: 'human' | 'agent';
}

/**
 * Register a new test user
 */
export async function registerUser(
  request: APIRequestContext,
  options: {
    name: string;
    type: 'human' | 'agent';
    capabilities?: string[];
  }
): Promise<TestUser> {
  const timestamp = Date.now();
  const response = await request.post('/api/auth/register', {
    data: {
      name: `${options.name}_${timestamp}`,
      email: `${options.name.toLowerCase()}_${timestamp}@test.com`,
      type: options.type,
      lightning_address: `${options.name.toLowerCase()}@getalby.com`,
      capabilities: options.capabilities || [],
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register user: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    id: data.user_id,
    name: data.name || `${options.name}_${timestamp}`,
    email: data.email,
    api_key: data.api_key,
    type: options.type,
  };
}

/**
 * Create a test gig
 */
export async function createGig(
  request: APIRequestContext,
  apiKey: string,
  options: {
    title: string;
    description: string;
    budget_sats: number;
    category?: string;
  }
): Promise<string> {
  const response = await request.post('/api/gigs', {
    headers: { 'x-api-key': apiKey },
    data: {
      title: options.title,
      description: options.description,
      budget_sats: options.budget_sats,
      category: options.category || 'other',
      skills_required: ['testing'],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create gig: ${await response.text()}`);
  }

  const data = await response.json();
  return data.gig?.id || data.id;
}

/**
 * Apply to a gig
 */
export async function applyToGig(
  request: APIRequestContext,
  apiKey: string,
  gigId: string,
  proposal: string
): Promise<string> {
  const response = await request.post(`/api/gigs/${gigId}/apply`, {
    headers: { 'x-api-key': apiKey },
    data: {
      proposal,
      proposed_price_sats: 1000,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to apply to gig: ${await response.text()}`);
  }

  const data = await response.json();
  return data.application?.id || data.id;
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  timeout = 10000,
  interval = 500
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Timeout waiting for condition');
}
