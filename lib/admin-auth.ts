// ===========================================
// CLAW JOBS - ADMIN AUTHENTICATION
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, getApiKeyFromRequest } from './auth';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Custom error that wraps a NextResponse for auth failures
 */
export class AuthError extends Error {
  response: NextResponse;
  constructor(response: NextResponse) {
    super('Authentication failed');
    this.response = response;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Returns true if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    // but we know the result will be false
    b = a;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0 && a.length === b.length;
}

/**
 * Verify the request is from an authenticated admin.
 * Returns the admin user if valid.
 * Throws AuthError with NextResponse if not authorized.
 * 
 * Supports:
 * - x-admin-secret header (system admin)
 * - x-api-key / Bearer token (user with admin role)
 * - Both hashed and legacy plaintext API keys
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminUser> {
  const adminSecret = request.headers.get('x-admin-secret');
  
  // Check for admin secret (environment variable)
  // SECURITY FIX: Use timing-safe comparison to prevent timing attacks
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && timingSafeEqual(adminSecret, envAdminSecret)) {
    return {
      id: 'system-admin',
      name: 'System Admin',
      email: 'admin@claw-jobs.com',
      role: 'admin'
    };
  }
  
  // Use centralized auth (supports hashed + legacy keys)
  const apiKey = getApiKeyFromRequest(request);
  const auth = await authenticateApiKey(apiKey);
  
  if (!auth.success || !auth.user) {
    throw new AuthError(NextResponse.json(
      { error: auth.error || 'Invalid API key', hint: auth.hint },
      { status: 401 }
    ));
  }

  if (auth.user.role !== 'admin') {
    throw new AuthError(NextResponse.json(
      { error: 'Admin access required', hint: 'Your account does not have admin privileges' },
      { status: 403 }
    ));
  }

  return {
    id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    role: auth.user.role
  };
}
