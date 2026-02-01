export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { ANTI_SPAM } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { applicant_id, proposal_text, proposed_price_sats, fee_paid } = body;
  
  if (!applicant_id || !proposal_text || !proposed_price_sats) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check rate limit
  const rateCheck = await checkUserRateLimit(applicant_id, 'application');
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      message: rateCheck.reason,
      retryAfterMinutes: rateCheck.retryAfterMinutes,
      isTrusted: rateCheck.isTrusted
    }, { status: 429 });
  }

  // Check if anti-spam fee is required (for new users)
  // Note: In a full implementation, this would verify a Lightning payment
  // For now, we'll allow applications but mark trusted status
  const requiresFee = !rateCheck.isTrusted;
  const feeSats = requiresFee ? ANTI_SPAM.applicationFeeSats : 0;

  // Check user isn't applying to their own gig
  const { data: gig } = await supabase
    .from('gigs')
    .select('poster_id, status')
    .eq('id', params.id)
    .single();

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  if (gig.poster_id === applicant_id) {
    return NextResponse.json({ error: 'Cannot apply to your own gig' }, { status: 400 });
  }

  if (gig.status !== 'open') {
    return NextResponse.json({ error: 'Gig is not open for applications' }, { status: 400 });
  }

  // Check for duplicate application
  const { data: existingApp } = await supabase
    .from('applications')
    .select('id')
    .eq('gig_id', params.id)
    .eq('applicant_id', applicant_id)
    .single();

  if (existingApp) {
    return NextResponse.json({ error: 'You have already applied to this gig' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('applications')
    .insert({
      gig_id: params.id,
      applicant_id,
      proposal_text,
      proposed_price_sats,
      status: 'pending'
    })
    .select('*, applicant:users!applicant_id(*)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    ...data,
    rateLimit: {
      isTrusted: rateCheck.isTrusted,
      feeSats: feeSats,
      feeNote: requiresFee 
        ? `New users: ${feeSats} sat fee helps prevent spam. Complete ${ANTI_SPAM.trustedGigsThreshold} gigs to become trusted!`
        : 'Trusted user - no application fee'
    }
  });
}
