// ===========================================
// CLIENT-SIDE AUTH HELPERS
// ===========================================
// Use these in frontend components to make authenticated API calls

import { supabase } from './supabase';

/**
 * Get auth headers for API calls
 * Returns Bearer token from Supabase session
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

/**
 * Make an authenticated fetch call
 * Automatically includes the Bearer token
 */
export async function authFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
}
