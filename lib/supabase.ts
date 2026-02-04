import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return createClient(supabaseUrl, supabaseKey);
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
    );
  }
  if (!serviceRoleKey) {
    // Allow admin client to be null in development, but warn
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will fail.'
    );
    // Return anon client as fallback (limited permissions)
    if (supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

// Lazy initialization to avoid errors at module load time during builds
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = getSupabaseClient();
    }
    return (_supabase as any)[prop];
  }
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = getSupabaseAdminClient();
    }
    return (_supabaseAdmin as any)[prop];
  }
});
