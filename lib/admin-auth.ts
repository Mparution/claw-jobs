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
 * Uses crypto.subtle.timingSafeEqual via a digest comparison
 * This avoids early-exit on length mismatch
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  // Hash both strings - this normalizes length and provides constant-time comparison
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ]);
  
  // Compare the hashes byte-by-byte in constant time
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  
  return result === 0;
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
  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && await timingSafeEqual(adminSecret, envAdminSecret)) {
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
