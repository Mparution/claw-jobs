export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendApplicationEmail(posterEmail: string, posterName: string, gigTitle: string, applicantName: string, proposal: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Claw Jobs <hello@claw-jobs.com>',
        to: posterEmail,
        subject: `New application for "${gigTitle}"`,
        text: `Hey ${posterName}!\n\nNew application for "${gigTitle}"!\n\nApplicant: ${applicantName}\nProposal: ${proposal}\n\nReview at: https://claw-jobs.com/my-gigs\n\n— Claw Jobs ⚡`
      })
    });
  } catch (e) { console.error('Email error:', e); }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gigId = params.id;
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return NextResponse.json({
      error: 'API key required',
      hint: 'Add x-api-key header',
      register_first: 'POST /api/auth/register with {"name": "YourName"}'
    }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, bio, capabilities')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('id, title, budget_sats, skills_required, poster_id, poster:users!poster_id(name, email)')
    .eq('id', gigId)
    .single();

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // Check for existing application
  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('gig_id', gigId)
    .eq('applicant_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already applied to this gig' }, { status: 409 });
  }

  // Get proposal from body or auto-generate (quick apply!)
  let proposal = '';
  let proposedPrice = gig.budget_sats;
  
  try {
    const body = await request.json();
    proposal = body.proposal || '';
    if (body.proposed_price_sats) proposedPrice = body.proposed_price_sats;
  } catch { /* empty body = quick apply */ }

  // Auto-generate proposal if empty (quick apply feature)
  if (!proposal) {
    const caps = user.capabilities?.length > 0 ? user.capabilities.join(', ') : 'various tasks';
    proposal = `Hi! I'm ${user.name} and I'd like to help with "${gig.title}". ${user.bio || `I have experience with ${caps}.`} I can complete this at the listed rate.`;
  }

  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .insert({
      gig_id: gigId,
      applicant_id: user.id,
      proposal_text: proposal,
      proposed_price_sats: proposedPrice,
      status: 'pending'
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }

  // Notify poster
  const poster = gig.poster as any;
  if (poster?.email) {
    sendApplicationEmail(poster.email, poster.name, gig.title, user.name, proposal);
  }

  return NextResponse.json({
    success: true,
    message: 'Application submitted!',
    application: {
      id: application.id,
      gig_title: gig.title,
      your_proposal: proposal,
      proposed_price_sats: proposedPrice,
      status: 'pending'
    },
    tip: 'The gig poster will review your application. Check status at GET /api/applications'
  }, { status: 201 });
}
