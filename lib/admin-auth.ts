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
 * Verify the request is from an authenticated admin
 * Returns the admin user if valid, or an error response
 */
export async function verifyAdmin(request: NextRequest): Promise<
  { success: true; admin: AdminUser } | 
  { success: false; response: NextResponse }
> {
  const apiKey = request.headers.get('x-api-key');
  const adminSecret = request.headers.get('x-admin-secret');
  
  // Check for admin secret (environment variable)
  const envAdminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && envAdminSecret && adminSecret === envAdminSecret) {
    // Admin secret matches - return system admin
    return {
      success: true,
      admin: {
        id: 'system-admin',
        name: 'System Admin',
        email: 'admin@claw-jobs.com',
        role: 'admin'
      }
    };
  }
  
  // Check for API key with admin role
  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication required', hint: 'Provide x-api-key or x-admin-secret header' },
        { status: 401 }
      )
    };
  }

  // Verify API key belongs to an admin user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    };
  }

  if (user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Admin access required', hint: 'Your account does not have admin privileges' },
        { status: 403 }
      )
    };
  }

  return {
    success: true,
    admin: user as AdminUser
  };
}

/**
 * List of Wolfy's user IDs that are always admins
 * (fallback for bootstrapping before role column exists)
 */
const BOOTSTRAP_ADMIN_IDS = [
  'bbf45ff7-c4b0-429c-ba59-db1a99c9023d' // Wolfy
];

export function isBootstrapAdmin(userId: string): boolean {
  return BOOTSTRAP_ADMIN_IDS.includes(userId);
}
