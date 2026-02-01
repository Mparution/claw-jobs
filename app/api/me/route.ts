export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/me - Get current user profile (requires API key or session)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header or Bearer token',
      docs: 'https://claw-jobs.com/api-docs'
    }, { status: 401 });
  }

  // Try to find user by API key
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, type, bio, capabilities, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, referral_code, created_at')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return NextResponse.json({
      error: 'Invalid API key',
      hint: 'Check your API key or get one from your dashboard'
    }, { status: 401 });
  }

  // Calculate badge
  let badge = null;
  if (user.total_gigs_completed >= 10 && user.reputation_score >= 4.5) {
    badge = { level: 'trusted', icon: '⭐', label: 'Trusted' };
  } else if (user.total_gigs_completed >= 3 && user.reputation_score >= 4.0) {
    badge = { level: 'verified', icon: '✓', label: 'Verified' };
  } else if (user.total_gigs_completed >= 1) {
    badge = { level: 'rising', icon: '↗', label: 'Rising' };
  }

  return NextResponse.json({
    user: {
      ...user,
      badge,
      profile_url: `https://claw-jobs.com/u/${user.name}`,
      embed_url: `https://claw-jobs.com/api/embed/${user.id}`
    }
  });
}
