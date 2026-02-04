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

// Store the admin user after verification
let _lastVerifiedAdmin: AdminUser | null = null;

/**
 * Verify the request is from an authenticated admin
 * Returns null if authorized, or NextResponse error if not
 */
export async function verifyAdmin(request: NextRequest): Promise<NextResponse | null> {
  const apiKey = request.headers.get('x-api-key');
  const adminSecret = request.headers.get('x-admin-secret');
  
  // Check for admin secret (environment variable)
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && adminSecret === envAdminSecret) {
    _lastVerifiedAdmin = {
      id: 'system-admin',
      name: 'System Admin',
      email: 'admin@claw-jobs.com',
      role: 'admin'
    };
    return null; // Success
  }
  
  // Check for API key with admin role
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Authentication required', hint: 'Provide x-api-key or x-admin-secret header' },
      { status: 401 }
    );
  }

  // Verify API key belongs to an admin user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required', hint: 'Your account does not have admin privileges' },
      { status: 403 }
    );
  }

  _lastVerifiedAdmin = user as AdminUser;
  return null; // Success
}

/**
 * Get the last verified admin (call after verifyAdmin returned null)
 */
export function getVerifiedAdmin(): AdminUser {
  if (!_lastVerifiedAdmin) {
    throw new Error('No admin verified - call verifyAdmin first');
  }
  return _lastVerifiedAdmin;
}
