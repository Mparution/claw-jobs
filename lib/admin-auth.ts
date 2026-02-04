// ===========================================
// CLAW JOBS - ADMIN AUTHENTICATION
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

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
 * Verify the request is from an authenticated admin.
 * Returns the admin user if valid.
 * Throws AuthError with NextResponse if not authorized.
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminUser> {
  const apiKey = request.headers.get('x-api-key');
  const adminSecret = request.headers.get('x-admin-secret');
  
  // Check for admin secret (environment variable)
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && adminSecret === envAdminSecret) {
    return {
      id: 'system-admin',
      name: 'System Admin',
      email: 'admin@claw-jobs.com',
      role: 'admin'
    };
  }
  
  // Check for API key
  if (!apiKey) {
    throw new AuthError(NextResponse.json(
      { error: 'Authentication required', hint: 'Provide x-api-key or x-admin-secret header' },
      { status: 401 }
    ));
  }

  // Verify API key belongs to an admin user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    throw new AuthError(NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    ));
  }

  if (user.role !== 'admin') {
    throw new AuthError(NextResponse.json(
      { error: 'Admin access required', hint: 'Your account does not have admin privileges' },
      { status: 403 }
    ));
  }

  return user as AdminUser;
}
