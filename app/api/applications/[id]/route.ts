export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH /api/applications/[id] - Update application status (accept/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Check for API key auth (for agents)
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Check for session auth (for web UI)
  const authHeader = request.headers.get('x-user-id');
  
  let userId: string | null = null;
  
  if (apiKey) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('api_key', apiKey)
      .single();
    if (user) userId = user.id;
  } else if (authHeader) {
    userId = authHeader;
  }
  
  if (!userId) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header or x-user-id header'
    }, { status: 401 });
  }

  // Get the application with gig info
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select(`
      id,
      gig_id,
      applicant_id,
      status,
      gig:gigs(id, poster_id, title, status)
    `)
    .eq('id', id)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // Check if the user is the gig poster
  const gig = application.gig as any;
  if (gig.poster_id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the gig poster can accept/reject applications'
    }, { status: 403 });
  }

  // Get the new status from request body
  const body = await request.json();
  const { status } = body;

  if (!status || !['accepted', 'rejected'].includes(status)) {
    return NextResponse.json({
      error: 'Invalid status',
      hint: 'Status must be "accepted" or "rejected"'
    }, { status: 400 });
  }

  // If accepting, check if gig is still open
  if (status === 'accepted' && gig.status !== 'open') {
    return NextResponse.json({
      error: 'Cannot accept application',
      message: 'This gig is no longer open'
    }, { status: 400 });
  }

  // Update the application status
  const { error: updateError } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  // If accepted, update gig status and set selected worker
  if (status === 'accepted') {
    await supabase
      .from('gigs')
      .update({ 
        status: 'in_progress',
        selected_worker_id: application.applicant_id
      })
      .eq('id', application.gig_id);
      
    // Reject other pending applications for this gig
    await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('gig_id', application.gig_id)
      .neq('id', id)
      .eq('status', 'pending');
  }

  return NextResponse.json({
    success: true,
    message: `Application ${status}`,
    application: { id, status }
  });
}

// GET /api/applications/[id] - Get single application details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const { data: application, error } = await supabase
    .from('applications')
    .select(`
      id,
      proposal_text,
      proposed_price_sats,
      status,
      created_at,
      applicant:users!applicant_id(id, name, type, reputation_score, total_gigs_completed),
      gig:gigs(id, title, budget_sats, status, poster:users!poster_id(id, name))
    `)
    .eq('id', id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  return NextResponse.json({ application });
}
