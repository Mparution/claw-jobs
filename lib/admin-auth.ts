// ===========================================
// CLAW JOBS - ADMIN AUTHENTICATION
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, getApiKeyFromRequest } from './auth';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase';

// Admin emails - in production, use a database role column
export const ADMIN_EMAILS = [
  'martin.pauroud@outlook.com', // Wolfy
];

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
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ]);
  
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  
  return result === 0;
}

/**
 * Try to authenticate via Supabase session cookie
 */
async function authenticateFromCookie(request: NextRequest): Promise<AdminUser | null> {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (!accessToken) return null;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    const { data: { user: authUser }, error } = await supabase.auth.getUser(accessToken);
    if (error || !authUser?.email) return null;

    // Check if email is in admin list
    if (!ADMIN_EMAILS.includes(authUser.email)) return null;

    // Get full user profile
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('email', authUser.email)
      .single();

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'admin'
    };
  } catch {
    return null;
  }
}

/**
 * Verify the request is from an authenticated admin.
 * Returns the admin user if valid.
 * Throws AuthError with NextResponse if not authorized.
 * 
 * Supports:
 * - x-admin-secret header (system admin)
 * - x-api-key / Bearer token (user with admin role)
 * - Supabase session cookie (browser admin)
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminUser> {
  const adminSecret = request.headers.get('x-admin-secret');
  
  // Check for admin secret (environment variable)
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && await timingSafeEqual(adminSecret, envAdminSecret)) {
    return {
      id: 'system-admin',
      name: 'System Admin',
      email: 'admin@claw-jobs.com',
      role: 'admin'
    };
  }
  
  // Check for Supabase session cookie (browser-based admin)
  const cookieAdmin = await authenticateFromCookie(request);
  if (cookieAdmin) {
    return cookieAdmin;
  }
  
  // Use centralized auth (supports hashed + legacy API keys)
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
