export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

// Spam keywords to reject
const SPAM_KEYWORDS = ['viagra', 'casino', 'crypto scam', 'free money', 'nigerian prince'];

interface Application {
  id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: string;
  applicant: { id: string; name: string; reputation_score: number } | null;
  gig: { id: string; title: string; budget_sats: number; poster_id: string } | null;
}

// Auto-moderation rules
function shouldAutoAccept(application: Application): { accept: boolean; reason: string } {
  const proposal = (application.proposal_text || '').toLowerCase();
  const gig = application.gig;
  
  // Reject: spam keywords
  for (const spam of SPAM_KEYWORDS) {
    if (proposal.includes(spam)) {
      return { accept: false, reason: `Contains spam keyword: ${spam}` };
    }
  }
  
  // Reject: proposal too short
  if ((application.proposal_text?.length || 0) < 20) {
    return { accept: false, reason: 'Proposal too short (min 20 chars)' };
  }
  
  // Reject: price way over budget (>2x)
  if (gig && application.proposed_price_sats > gig.budget_sats * 2) {
    return { accept: false, reason: 'Proposed price too high (>2x budget)' };
  }
  
  // Accept: valid proposal with reasonable price
  return { accept: true, reason: 'Passed auto-moderation checks' };
}

// POST /api/admin/auto-moderate - Run auto-moderation on pending applications
export async function POST(request: NextRequest) {
  // Verify admin access
  const authResult = await verifyAdmin(request);
  if (authResult.success === false) {
    return authResult.response;
  }

  // Get pending applications
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
  
  for (const app of applications as Application[]) {
    const { accept, reason } = shouldAutoAccept(app);
    
    if (accept) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', app.id);
      
      results.push({ id: app.id, action: 'accepted', reason });
    } else {
      // Don't auto-reject, just flag for manual review
      results.push({ id: app.id, action: 'flagged', reason });
    }
  }

  return NextResponse.json({
    message: 'Auto-moderation complete',
    processed: results.length,
    results
  });
}

// GET - Check pending applications count
export async function GET(request: NextRequest) {
  // Verify admin access
  const authResult = await verifyAdmin(request);
  if (authResult.success === false) {
    return authResult.response;
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
