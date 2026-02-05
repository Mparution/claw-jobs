// ===========================================
// CLAW JOBS - CENTRALIZED AUTHENTICATION
// ===========================================
// Supports:
// 1. Supabase JWT tokens (browser sessions) - GOLD STANDARD
// 2. API keys (agent/external API access)

import { supabaseAdmin } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { getApiKeyPrefix, verifyApiKey, isApiKeyExpired } from './api-key-hash';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  type: 'agent' | 'human';
  role?: string;
  gigs_completed?: number;
  reputation_score?: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  hint?: string;
}

/**
 * Verify Supabase JWT token and get user
 * This is the GOLD STANDARD for browser authentication
 */
async function authenticateJWT(token: string): Promise<AuthResult> {
  try {
    // Create a temporary client to verify the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Server misconfigured' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // getUser() validates the JWT and returns the user
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !authUser?.email) {
      return { 
        success: false, 
        error: 'Invalid or expired token',
        hint: 'Please sign in again'
      };
    }

    // Get full user profile from our users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, type, role, gigs_completed, reputation_score')
      .eq('email', authUser.email)
      .single();

    if (userError || !user) {
      return {
        success: false,
        error: 'User profile not found',
        hint: 'Your account may not be fully set up'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        role: user.role,
        gigs_completed: user.gigs_completed,
        reputation_score: user.reputation_score
      }
    };
  } catch (e) {
    console.error('JWT auth error:', e);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Authenticate using API key (for agents/external API clients)
 * Supports both hashed (new) and plaintext (legacy) keys
 */
export async function authenticateApiKey(apiKey: string | null): Promise<AuthResult> {
  if (!apiKey) {
    return {
      success: false,
      error: 'Authentication required',
      hint: 'Provide x-api-key header or Bearer token'
    };
  }

  // Strategy 1: Try hashed lookup (new keys)
  const prefix = getApiKeyPrefix(apiKey);
  
  const { data: hashedUsers } = await supabaseAdmin
    .from('users')
    .select('id, name, email, type, role, gigs_completed, reputation_score, api_key_hash, api_key_expires_at')
    .eq('api_key_prefix', prefix);

  if (hashedUsers && hashedUsers.length > 0) {
    for (const user of hashedUsers) {
      if (isApiKeyExpired(user.api_key_expires_at)) {
        continue;
      }
      
      if (user.api_key_hash) {
        const isValid = await verifyApiKey(apiKey, user.api_key_hash);
        if (isValid) {
          return {
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              type: user.type,
              role: user.role,
              gigs_completed: user.gigs_completed,
              reputation_score: user.reputation_score
            }
          };
        }
      }
    }
  }

  // Strategy 2: Fallback to plaintext lookup (legacy keys)
  const { data: legacyUser, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, type, role, gigs_completed, reputation_score')
    .eq('api_key', apiKey)
    .single();

  if (error || !legacyUser) {
    return { success: false, error: 'Invalid API key' };
  }

  return {
    success: true,
    user: {
      id: legacyUser.id,
      name: legacyUser.name,
      email: legacyUser.email,
      type: legacyUser.type,
      role: legacyUser.role,
      gigs_completed: legacyUser.gigs_completed,
      reputation_score: legacyUser.reputation_score
    }
  };
}

/**
 * Extract credentials from request headers
 */
function getCredentialsFromRequest(request: Request): { 
  apiKey: string | null; 
  bearerToken: string | null;
} {
  const apiKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  return { apiKey, bearerToken };
}

/**
 * Main authentication function - use this in all API routes
 * 
 * Priority:
 * 1. x-api-key header (API clients/agents)
 * 2. Bearer token - try as API key first, then as JWT (browser sessions)
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const { apiKey, bearerToken } = getCredentialsFromRequest(request);

  // Priority 1: Explicit API key header
  if (apiKey) {
    return authenticateApiKey(apiKey);
  }

  // Priority 2: Bearer token (could be API key or JWT)
  if (bearerToken) {
    // First try as API key (for agents using Bearer format)
    const apiKeyResult = await authenticateApiKey(bearerToken);
    if (apiKeyResult.success) {
      return apiKeyResult;
    }

    // Then try as Supabase JWT (for browser sessions)
    const jwtResult = await authenticateJWT(bearerToken);
    if (jwtResult.success) {
      return jwtResult;
    }

    // Both failed
    return {
      success: false,
      error: 'Invalid credentials',
      hint: 'Token is neither a valid API key nor a valid session token'
    };
  }

  return {
    success: false,
    error: 'Authentication required',
    hint: 'Provide x-api-key header or Authorization: Bearer <token>'
  };
}
