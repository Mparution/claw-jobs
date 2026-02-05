export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

interface ApplicationPayload {
  type: 'INSERT';
  table: 'applications';
  record: {
    id: string;
    gig_id: string;
    applicant_id: string;
    proposal_text: string;
    status: string;
  };
}

// POST /api/webhooks/application-created
// Called by Supabase when a new application is inserted
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization');
  if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    console.error('Invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: ApplicationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only process INSERT events on applications
  if (payload.type !== 'INSERT' || !payload.record?.id) {
    return NextResponse.json({ message: 'Ignored - not an INSERT' });
  }

  const appId = payload.record.id;

  // Fetch full application details
  const { data: app, error } = await supabaseAdmin
    .from('applications')
    .select(`
      id, gig_id, applicant_id, proposal_text, status, created_at,
      applicant:users!applicant_id(id, name, type, gigs_completed, reputation_score),
      gig:gigs!gig_id(id, title, poster_id, status, is_testnet, budget_sats, selected_worker_id)
    `)
    .eq('id', appId)
    .single();

  if (error || !app) {
    console.error('Failed to fetch application:', error);
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const gig = app.gig as any;
  const applicant = app.applicant as any;

  // Already processed?
  if (app.status !== 'pending') {
    return NextResponse.json({ message: 'Already processed', status: app.status });
  }

  // === REVIEW LOGIC ===
  let decision: 'accept' | 'reject' | 'skip' = 'skip';
  let reason = '';

  // 1. Gig already has a worker
  if (gig.selected_worker_id) {
    decision = 'reject';
    reason = 'Gig already has a selected worker';
  }
  // 2. Gig not open
  else if (gig.status !== 'open') {
    decision = 'reject';
    reason = `Gig status is ${gig.status}, not open`;
  }
  // 3. Testnet gig - auto-accept (no risk)
  else if (gig.is_testnet) {
    decision = 'accept';
    reason = 'Testnet gig - auto-accepted';
  }
  // 4. Mainnet - check quality
  else {
    const proposalLength = app.proposal_text?.length || 0;
    const hasExperience = (applicant.gigs_completed || 0) > 0;
    const hasReputation = (applicant.reputation_score || 0) >= 3;
    const isGenericProposal = app.proposal_text?.includes("I have experience with various tasks");
    
    // Accept if: good proposal AND (experienced OR has reputation)
    if (proposalLength > 100 && (hasExperience || hasReputation)) {
      decision = 'accept';
      reason = 'Quality proposal from experienced worker';
    }
    // Accept if: any proposal and very experienced
    else if (applicant.gigs_completed >= 3) {
      decision = 'accept';
      reason = 'Experienced worker (3+ completed gigs)';
    }
    // Reject generic mass-applications
    else if (isGenericProposal && proposalLength < 150) {
      decision = 'reject';
      reason = 'Generic auto-generated proposal';
    }
    // Skip for manual review
    else {
      decision = 'skip';
      reason = 'Needs manual review';
    }
  }

  // === EXECUTE DECISION ===
  if (decision === 'accept') {
    await supabaseAdmin
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', appId);
    
    await supabaseAdmin
      .from('gigs')
      .update({ status: 'in_progress', selected_worker_id: app.applicant_id })
      .eq('id', app.gig_id);

    console.log(`✅ ACCEPTED: ${applicant.name} → ${gig.title} (${reason})`);
  } 
  else if (decision === 'reject') {
    await supabaseAdmin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', appId);

    console.log(`❌ REJECTED: ${applicant.name} → ${gig.title} (${reason})`);
  }
  else {
    console.log(`⏸️ SKIPPED: ${applicant.name} → ${gig.title} (${reason})`);
  }

  return NextResponse.json({
    application_id: appId,
    applicant: applicant.name,
    gig: gig.title,
    decision,
    reason
  });
}
