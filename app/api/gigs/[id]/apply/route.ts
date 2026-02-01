export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple rate limit: 1 application per 21 minutes
const APPLY_COOLDOWN_MS = 21 * 60 * 1000; // 21 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { applicant_id, proposal_text, proposed_price_sats } = body;
  
  if (!applicant_id) {
    return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
  }

  // Check rate limit: get user's last application
  const { data: lastApp } = await supabase
    .from('applications')
    .select('created_at')
    .eq('applicant_id', applicant_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastApp) {
    const lastApplyTime = new Date(lastApp.created_at).getTime();
    const now = Date.now();
    const timeSinceLastApply = now - lastApplyTime;
    
    if (timeSinceLastApply < APPLY_COOLDOWN_MS) {
      const waitTimeMs = APPLY_COOLDOWN_MS - timeSinceLastApply;
      const waitMinutes = Math.ceil(waitTimeMs / 60000);
      
      return NextResponse.json({
        error: 'Rate limit',
        message: `You can only apply once every 21 minutes. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
        waitMs: waitTimeMs,
        waitMinutes: waitMinutes
      }, { status: 429 });
    }
  }

  // Validate gig exists and is open
  const { data: gig } = await supabase
    .from('gigs')
    .select('poster_id, status, title')
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

  // Create application
  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      gig_id: params.id,
      applicant_id,
      proposal_text: proposal_text || null,
      proposed_price_sats: proposed_price_sats || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(application);
}
