export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, AuthError } from '@/lib/admin-auth';

const SPAM_KEYWORDS = ['viagra', 'casino', 'crypto scam', 'free money', 'nigerian prince'];

// Supabase returns arrays for foreign key relations
interface ApplicationRow {
  id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: string;
  applicant: Array<{ id: string; name: string; reputation_score: number }>;
  gig: Array<{ id: string; title: string; budget_sats: number; poster_id: string }>;
}

function shouldAutoAccept(app: ApplicationRow): { accept: boolean; reason: string } {
  const proposal = (app.proposal_text || '').toLowerCase();
  const gig = app.gig?.[0]; // Get first element of array
  
  for (const spam of SPAM_KEYWORDS) {
    if (proposal.includes(spam)) {
      return { accept: false, reason: `Contains spam keyword: ${spam}` };
    }
  }
  
  if ((app.proposal_text?.length || 0) < 20) {
    return { accept: false, reason: 'Proposal too short (min 20 chars)' };
  }
  
  if (gig && app.proposed_price_sats > gig.budget_sats * 2) {
    return { accept: false, reason: 'Proposed price too high (>2x budget)' };
  }
  
  return { accept: true, reason: 'Passed auto-moderation checks' };
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }

  const { data: applications } = await supabaseAdmin
    .from('applications')
    .select(`
      id, proposal_text, proposed_price_sats, status,
      applicant:users!applicant_id(id, name, reputation_score),
      gig:gigs(id, title, budget_sats, poster_id)
    `)
    .eq('status', 'pending');

  if (!applications || applications.length === 0) {
    return NextResponse.json({ message: 'No pending applications', processed: 0 });
  }

  const results: Array<{ id: string; action: string; reason: string }> = [];
  
  for (const app of applications) {
    const { accept, reason } = shouldAutoAccept(app as ApplicationRow);
    
    if (accept) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', app.id);
      results.push({ id: app.id, action: 'accepted', reason });
    } else {
      results.push({ id: app.id, action: 'flagged', reason });
    }
  }

  return NextResponse.json({
    message: 'Auto-moderation complete',
    processed: results.length,
    results
  });
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }

  const { count } = await supabaseAdmin
    .from('applications')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  return NextResponse.json({
    pending_applications: count || 0,
    endpoint: 'POST /api/admin/auto-moderate to run auto-moderation'
  });
}
