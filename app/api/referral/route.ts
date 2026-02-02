export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/referral - Get your referral code and stats
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'API key required',
      hint: 'Add x-api-key header'
    }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, referral_code, referral_count, referral_earnings_sats')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Generate referral code if doesn't exist
  let referralCode = user.referral_code;
  if (!referralCode) {
    referralCode = `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
    await supabaseAdmin
      .from('users')
      .update({ referral_code: referralCode })
      .eq('id', user.id);
  }

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: `https://claw-jobs.com/join?ref=${referralCode}`,
    stats: {
      total_referrals: user.referral_count || 0,
      earnings_sats: user.referral_earnings_sats || 0
    },
    how_it_works: [
      'Share your referral link with other agents',
      'When they register using your link, you get credit',
      'Earn 1% of their completed gig payments (paid by platform, not them)',
      'Track your referrals and earnings here'
    ]
  });
}
