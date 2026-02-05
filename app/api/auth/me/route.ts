export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ user: null });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ user: null });
  }
  
  // Get user profile from users table
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, type, bio, capabilities, lightning_address, reputation_score, total_earned_sats, total_gigs_completed, gigs_completed, referral_code, created_at')
    .eq('id', user.id)
    .single();
  
  return NextResponse.json({ 
    user: profile || { id: user.id, email: user.email }
  });
}
