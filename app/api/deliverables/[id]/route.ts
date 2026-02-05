export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

// Type for the joined query result
interface DeliverableQueryResult {
  id: string;
  gig_id: string;
  worker_id: string;
  status: string;
  gig: { id: string; poster_id: string; title: string; budget_sats: number; status: string } | null;
}

// PATCH /api/deliverables/[id] - Review a deliverable (approve/reject/revision)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const userId = auth.user.id;

  // Get the deliverable with gig info
  const { data: deliverable, error: fetchError } = await supabase
    .from('deliverables')
    .select(`
      id,
      gig_id,
      worker_id,
      status,
      gig:gigs(id, poster_id, title, budget_sats, status)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  // Handle joined data with proper typing
  const rawDeliverable = deliverable as unknown as DeliverableQueryResult;
  const gig = rawDeliverable.gig;

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // Check if user is the gig poster
  if (gig.poster_id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the gig poster can review deliverables'
    }, { status: 403 });
  }

  // Check if deliverable is pending
  if (rawDeliverable.status !== 'pending') {
    return NextResponse.json({ 
      error: 'Cannot review',
      message: `Deliverable status is "${rawDeliverable.status}", must be "pending"`
    }, { status: 400 });
  }

  const body = await request.json();
  const { status, feedback, rating, review_text } = body;

  if (!status || !['approved', 'rejected', 'revision_requested'].includes(status)) {
    return NextResponse.json({
      error: 'Invalid status',
      hint: 'Status must be "approved", "rejected", or "revision_requested"'
    }, { status: 400 });
  }

  // Update deliverable
  const { error: updateError } = await supabaseAdmin
    .from('deliverables')
    .update({ status, feedback: feedback || null })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 });
  }

  // Update gig status based on review
  let newGigStatus: string;
  if (status === 'approved') {
    newGigStatus = 'completed';
    
    // Create rating if provided
    if (rating && rating >= 1 && rating <= 5) {
      await supabaseAdmin
        .from('ratings')
        .insert({
          gig_id: rawDeliverable.gig_id,
          rater_id: userId,
          rated_id: rawDeliverable.worker_id,
          score: rating,
          review_text: review_text || null
        });

      // Update worker's reputation
      const { data: workerRatings } = await supabaseAdmin
        .from('ratings')
        .select('score')
        .eq('rated_id', rawDeliverable.worker_id);

      if (workerRatings && workerRatings.length > 0) {
        const avgScore = workerRatings.reduce((sum, r) => sum + r.score, 0) / workerRatings.length;
        await supabaseAdmin
          .from('users')
          .update({ 
            reputation_score: Math.round(avgScore * 10) / 10,
            total_gigs_completed: workerRatings.length
          })
          .eq('id', rawDeliverable.worker_id);
      }
    }

    try { await supabaseAdmin.rpc('increment_gigs_posted', { user_id: userId }); } catch { /* RPC might not exist */ }

  } else if (status === 'revision_requested') {
    newGigStatus = 'in_progress';
  } else {
    newGigStatus = 'disputed';
  }

  await supabaseAdmin
    .from('gigs')
    .update({ status: newGigStatus })
    .eq('id', rawDeliverable.gig_id);

  return NextResponse.json({
    success: true,
    message: status === 'approved' 
      ? 'Deliverable approved! Gig completed.' 
      : status === 'revision_requested'
      ? 'Revision requested. Worker can resubmit.'
      : 'Deliverable rejected. Gig disputed.',
    deliverable: { id, status },
    gig_status: newGigStatus
  });
}

// GET /api/deliverables/[id] - Get single deliverable
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .select(`
      id,
      content,
      files,
      status,
      feedback,
      submitted_at,
      worker:users!worker_id(id, name, type, reputation_score),
      gig:gigs(id, title, budget_sats, status, poster:users!poster_id(id, name))
    `)
    .eq('id', id)
    .single();

  if (error || !deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  return NextResponse.json({ deliverable });
}
