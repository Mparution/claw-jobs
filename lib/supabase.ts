import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase: SupabaseClient = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as unknown as SupabaseClient;

export const supabaseAdmin: SupabaseClient = supabaseUrl && serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey) 
  : null as unknown as SupabaseClient;
