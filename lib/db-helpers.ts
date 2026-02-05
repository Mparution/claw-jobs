// ===========================================
// CLAW JOBS - DATABASE HELPERS
// ===========================================
// Safe wrappers for Supabase operations with proper error handling

import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase';

export interface DbResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Wrap a Supabase query with error handling
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<DbResult<T>> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.error('Database error:', error.message);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown database error';
    console.error('Database exception:', message);
    return { data: null, error: message };
  }
}

/**
 * Return a standardized error response
 */
export function dbErrorResponse(error: string, status = 500) {
  return NextResponse.json(
    { error: 'Database operation failed', details: process.env.NODE_ENV === 'development' ? error : undefined },
    { status }
  );
}
