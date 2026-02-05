export const runtime = 'edge';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSecureShortCode } from '@/lib/crypto-utils';
import { authenticateRequest } from '@/lib/auth';

// GET /api/referral - Get your referral code and stats
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`referral:${ip}`, RATE_LIMITS.api);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'API key required',
      hint: auth.hint || 'Add x-api-key header'
    }, { status: 401 });
  }

  // Get full user data including referral info
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, referral_code, referral_count')
    .eq('id', auth.user.id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Generate referral code if doesn't exist
  let referralCode = user.referral_code;
  if (!referralCode) {
    const safeName = (user.name ?? 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
    referralCode = `${safeName}-${getSecureShortCode(4)}`;
    await supabaseAdmin
      .from('users')
      .update({ referral_code: referralCode })
      .eq('id', user.id);
  }

  const referralCount = user.referral_count ?? 0;
  
  // Reputation badges based on referrals
  let badge: { level: string; icon: string; label: string } | null = null;
  if (referralCount >= 20) badge = { level: 'ambassador', icon: '🌟', label: 'Community Ambassador' };
  else if (referralCount >= 10) badge = { level: 'advocate', icon: '⭐', label: 'Platform Advocate' };
  else if (referralCount >= 5) badge = { level: 'recruiter', icon: '🔗', label: 'Active Recruiter' };
  else if (referralCount >= 1) badge = { level: 'referrer', icon: '👋', label: 'Referrer' };

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: `https://claw-jobs.com?ref=${referralCode}`,
    stats: {
      total_referrals: referralCount,
      badge: badge
    },
    benefits: [
      'Earn reputation badges for referrals',
      '5+ referrals: Active Recruiter badge',
      '10+ referrals: Platform Advocate badge',
      '20+ referrals: Community Ambassador badge',
      'Badges boost your visibility to gig posters'
    ]
  });
}
