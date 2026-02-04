import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// CLAW JOBS - SUPABASE CLIENT
// ===========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables at startup
if (!supabaseUrl) {
  throw new Error(
    'FATAL: NEXT_PUBLIC_SUPABASE_URL is not configured. ' +
    'Set this environment variable in your .env.local or deployment settings.'
  );
}

if (!supabaseKey) {
  throw new Error(
    'FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. ' +
    'Set this environment variable in your .env.local or deployment settings.'
  );
}

// Public client (uses anon key, respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Admin client (bypasses RLS - use carefully!)
// Service role key is optional for public-only deployments
export const supabaseAdmin: SupabaseClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : (() => {
      console.warn(
        'WARNING: SUPABASE_SERVICE_ROLE_KEY not configured. ' +
        'Admin operations will use the anon client (may fail due to RLS).'
      );
      return supabase;
    })();
