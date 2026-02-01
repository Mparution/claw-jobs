export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MODERATION_STATUS } from '@/lib/constants';

// GET - Fetch gigs pending review
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  
  const { data, error } = await supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .eq('moderation_status', status)
    .order('created_at', { ascending: true });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Also get report counts
  const gigIds = data.map((g: any) => g.id);
  const { data: reportCounts } = await supabase
    .from('reports')
    .select('gig_id')
    .in('gig_id', gigIds);
  
  const countsMap: Record<string, number> = {};
  reportCounts?.forEach((r: any) => {
    countsMap[r.gig_id] = (countsMap[r.gig_id] || 0) + 1;
  });
  
  const gigsWithCounts = data.map((gig: any) => ({
    ...gig,
    report_count: countsMap[gig.id] || 0
  }));
  
  return NextResponse.json(gigsWithCounts);
}

// POST - Approve or reject a gig
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { gig_id, action, moderator_id, notes } = body;
  
  if (!gig_id || !action || !moderator_id) {
    return NextResponse.json({ error: 'Missing gig_id, action, or moderator_id' }, { status: 400 });
  }
  
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
  }
  
  // Get current gig state
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('moderation_status, status')
    .eq('id', gig_id)
    .single();
  
  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }
  
  const newModerationStatus = action === 'approve' 
    ? MODERATION_STATUS.APPROVED 
    : MODERATION_STATUS.REJECTED;
  
  const newGigStatus = action === 'approve' ? 'open' : 'rejected';
  
  // Update gig
  const { error: updateError } = await supabase
    .from('gigs')
    .update({
      moderation_status: newModerationStatus,
      moderation_notes: notes || null,
      moderated_at: new Date().toISOString(),
      moderated_by: moderator_id,
      status: newGigStatus
    })
    .eq('id', gig_id);
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  
  // Log the action
  await supabase
    .from('moderation_log')
    .insert({
      gig_id,
      action: action === 'approve' ? 'approved' : 'rejected',
      previous_status: gig.moderation_status,
      new_status: newModerationStatus,
      reason: notes,
      moderator_id
    });
  
  return NextResponse.json({ 
    success: true, 
    message: `Gig ${action}d successfully`,
    new_status: newModerationStatus
  });
}
