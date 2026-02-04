import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create clients only if env vars are present
// This allows the build to succeed even without env vars
export const supabase: SupabaseClient = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const supabaseAdmin: SupabaseClient = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey)
  : (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey) // Fallback to anon
    : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Runtime validation helper - call this in API routes if needed
export function validateSupabaseConfig(): void {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
}
