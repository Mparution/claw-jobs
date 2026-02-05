export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SENDER_FROM } from '@/lib/constants';
import { authenticateRequest, requireAuth } from '@/lib/auth';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Type for the joined query result
interface GigQueryResult {
  id: string;
  title: string;
  budget_sats: number;
  required_capabilities: string[];
  poster_id: string;
  poster: { name: string; email: string } | null;
}

async function sendApplicationEmail(posterEmail: string, posterName: string, gigTitle: string, applicantName: string, proposal: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: SENDER_FROM,
        to: posterEmail,
        subject: `New application for "${gigTitle}"`,
        text: `Hey ${posterName}!\n\nNew application for "${gigTitle}"!\n\nApplicant: ${applicantName}\nProposal: ${proposal}\n\nReview at: https://claw-jobs.com/my-gigs\n\n— Claw Jobs ⚡`
      })
    });
  } catch (e) { console.error('Email error:', e); }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Rate limiting - 10 applications per minute
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`apply:${ip}`, RATE_LIMITS.apply);
  if (!allowed) return NextResponse.json({ error: 'Too many applications. Try again in a minute.' }, { status: 429 });
  const gigId = params.id;
  
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  const authError = requireAuth(auth);
  if (authError) return authError;
    }, { status: 401 });
  }

  // Get additional user data needed for application
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('bio, capabilities')
    .eq('id', auth.user.id)
    .single();

  const user = {
    ...auth.user,
    bio: userData?.bio,
    capabilities: userData?.capabilities || []
  };

  const { data: gigRaw } = await supabaseAdmin
    .from('gigs')
    .select('id, title, budget_sats, required_capabilities, poster_id, poster:users!poster_id(name, email)')
    .eq('id', gigId)
    .single();

  if (!gigRaw) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // Handle joined data with proper typing
  const gig = gigRaw as unknown as GigQueryResult;

  // Get proposal from body or auto-generate
  let proposal = '';
  let proposedPrice = gig.budget_sats;
  
  try {
    const body = await request.json();
    proposal = body.proposal || '';
    if (body.proposed_price_sats) proposedPrice = body.proposed_price_sats;
  } catch { /* empty body = quick apply */ }

  // Auto-generate proposal if empty
  if (!proposal) {
    const caps = user.capabilities?.length > 0 ? user.capabilities.join(', ') : 'various tasks';
    proposal = `Hi! I'm ${user.name} and I'd like to help with "${gig.title}". ${user.bio || `I have experience with ${caps}.`} I can complete this at the listed rate.`;
  }

  // Insert application - DB constraint handles duplicates
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
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json({ 
        error: 'Already applied to this gig',
        hint: 'You can only apply once per gig'
      }, { status: 409 });
    }
    console.error('Application insert error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }

  // Notify poster
  if (gig.poster?.email) {
    sendApplicationEmail(gig.poster.email, gig.poster.name, gig.title, user.name, proposal);
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
