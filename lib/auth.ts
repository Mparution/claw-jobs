// ===========================================
// CLAW JOBS - CENTRALIZED AUTHENTICATION
// ===========================================
// All API routes should use this for authentication
// Supports both hashed keys (new) and plaintext keys (legacy migration)

import { supabaseAdmin } from './supabase';
import { hashApiKey, getApiKeyPrefix, verifyApiKey, isApiKeyExpired } from './api-key-hash';

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
 * Authenticate a request using API key
 * Supports both hashed (new) and plaintext (legacy) keys
 * 
 * Usage:
 * ```ts
 * const auth = await authenticateApiKey(request.headers.get('x-api-key'));
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 });
 * }
 * const user = auth.user!;
 * ```
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
  // Look up by prefix, then verify hash
  const prefix = getApiKeyPrefix(apiKey);
  
  const { data: hashedUsers } = await supabaseAdmin
    .from('users')
    .select('id, name, email, type, role, gigs_completed, reputation_score, api_key_hash, api_key_expires_at')
    .eq('api_key_prefix', prefix);

  if (hashedUsers && hashedUsers.length > 0) {
    for (const user of hashedUsers) {
      // Check expiry first
      if (isApiKeyExpired(user.api_key_expires_at)) {
        continue; // Try next user with same prefix (unlikely but possible)
      }
      
      // Verify hash
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
  // TODO: Remove this after all keys are migrated to hashed
  const { data: legacyUser, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, type, role, gigs_completed, reputation_score')
    .eq('api_key', apiKey)
    .single();

  if (error || !legacyUser) {
    return {
      success: false,
      error: 'Invalid API key'
    };
  }

  // Legacy key found - consider logging for migration tracking
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
 * Extract API key from request headers
 */
export function getApiKeyFromRequest(request: Request): string | null {
  return request.headers.get('x-api-key') || 
         request.headers.get('authorization')?.replace('Bearer ', '') || 
         null;
}

/**
 * Quick authentication helper that combines extraction and auth
 * Supports:
 * - x-api-key header (API clients/agents)
 * - Bearer token (API clients)
 * - x-user-id header (browser sessions - for frontend AJAX calls)
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // First try API key auth (for external API clients)
  const apiKey = getApiKeyFromRequest(request);
  if (apiKey) {
    return authenticateApiKey(apiKey);
  }
  
  // Fallback: x-user-id header for browser sessions
  // This is used by frontend pages that already authenticated via Supabase Auth
  const userId = request.headers.get('x-user-id');
  if (userId) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, type, role, gigs_completed, reputation_score')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return {
        success: false,
        error: 'User not found',
        hint: 'Invalid x-user-id'
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
  }
  
  return {
    success: false,
    error: 'Authentication required',
    hint: 'Provide x-api-key header, Bearer token, or x-user-id'
  };
}
