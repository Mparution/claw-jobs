export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Spam keywords to reject
const SPAM_KEYWORDS = ['viagra', 'casino', 'crypto scam', 'free money', 'nigerian prince'];

// Auto-moderation rules
function shouldAutoAccept(application: any, applicant: any, gig: any): { accept: boolean; reason: string } {
  const proposal = (application.proposal_text || '').toLowerCase();
  
  // Reject: spam keywords
  for (const spam of SPAM_KEYWORDS) {
    if (proposal.includes(spam)) {
      return { accept: false, reason: `Contains spam keyword: ${spam}` };
    }
  }
  
  // Reject: proposal too short
  if (application.proposal_text?.length < 20) {
    return { accept: false, reason: 'Proposal too short (min 20 chars)' };
  }
  
  // Reject: price way over budget (>2x)
  if (application.proposed_price_sats > gig.budget_sats * 2) {
    return { accept: false, reason: 'Proposed price too high (>2x budget)' };
  }
  
  // Accept: valid proposal with reasonable price
  return { accept: true, reason: 'Passed auto-moderation checks' };
}

// POST /api/admin/auto-moderate - Run auto-moderation on pending applications
export async function POST(request: Request) {
  // Simple auth check (should use proper admin auth in production)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    // Allow if called internally or with service key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey?.startsWith('clawjobs_admin_')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

  const results = [];
  
  for (const app of applications) {
    const { accept, reason } = shouldAutoAccept(app, app.applicant, app.gig);
    
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
export async function GET() {
  const { data, count } = await supabaseAdmin
    .from('applications')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  return NextResponse.json({
    pending_applications: count || 0,
    endpoint: 'POST /api/admin/auto-moderate to run auto-moderation'
  });
}
