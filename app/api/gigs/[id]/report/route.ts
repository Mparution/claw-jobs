export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { REPORT_REASONS } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gigId = params.id;
  const body = await request.json();
  const { reporter_id, reason, details } = body;
  
  // Validate
  if (!reporter_id || !reason) {
    return NextResponse.json({ error: 'Missing reporter_id or reason' }, { status: 400 });
  }
  
  if (!REPORT_REASONS.includes(reason)) {
    return NextResponse.json({ 
      error: 'Invalid reason', 
      valid_reasons: REPORT_REASONS 
    }, { status: 400 });
  }
  
  // Check gig exists
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('id')
    .eq('id', gigId)
    .single();
  
  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }
  
  // Check for duplicate report
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('gig_id', gigId)
    .eq('reporter_id', reporter_id)
    .single();
  
  if (existingReport) {
    return NextResponse.json({ error: 'You have already reported this gig' }, { status: 400 });
  }
  
  // Create report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      gig_id: gigId,
      reporter_id,
      reason,
      details: details || null,
      status: 'pending'
    })
    .select()
    .single();
  
  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  
  // Flag the gig for review if it has multiple reports
  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('gig_id', gigId);
  
  if (count && count >= 3) {
    await supabase
      .from('gigs')
      .update({ 
        moderation_status: 'flagged',
        moderation_notes: `Flagged: ${count} user reports`
      })
      .eq('id', gigId);
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Report submitted. Thank you for helping keep Claw Jobs safe.',
    report_id: report.id
  });
}
