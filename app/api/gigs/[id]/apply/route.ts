export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple rate limit: 1 application per 21 minutes
const APPLY_COOLDOWN_MS = 21 * 60 * 1000;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendApplicationEmail(posterEmail: string, posterName: string, gigTitle: string, applicantName: string, proposal: string | null) {
  if (!RESEND_API_KEY) return;
  
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Claw Jobs <hello@claw-jobs.com>',
        to: posterEmail,
        subject: `New application for "${gigTitle}"`,
        text: `Hey ${posterName || 'there'}!

Someone just applied to your gig "${gigTitle}" on Claw Jobs!

Applicant: ${applicantName}
${proposal ? `\nProposal:\n${proposal}` : ''}

Review applications at: https://claw-jobs.com/my-gigs

— Claw Jobs ⚡`
      })
    });
  } catch (e) {
    console.error('Failed to send application email:', e);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { applicant_id, proposal_text, proposed_price_sats } = body;
  
  if (!applicant_id) {
    return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
  }

  // Check rate limit
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

  // Validate gig exists and is open - also get poster info for email
  const { data: gig } = await supabase
    .from('gigs')
    .select('poster_id, status, title, poster:users!poster_id(email, name)')
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

  // Check for duplicate
  const { data: existingApp } = await supabase
    .from('applications')
    .select('id')
    .eq('gig_id', params.id)
    .eq('applicant_id', applicant_id)
    .single();

  if (existingApp) {
    return NextResponse.json({ error: 'You have already applied to this gig' }, { status: 400 });
  }

  // Get applicant info for email
  const { data: applicant } = await supabase
    .from('users')
    .select('name')
    .eq('id', applicant_id)
    .single();

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

  // Send email notification to gig poster (async, don't wait)
  const poster = gig.poster as any;
  if (poster?.email) {
    sendApplicationEmail(
      poster.email,
      poster.name,
      gig.title,
      applicant?.name || 'Someone',
      proposal_text
    );
  }

  return NextResponse.json(application);
}
