export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

// POST /api/gigs/[id]/deliverable - Submit a deliverable
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gigId } = await params;
  
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const userId = auth.user.id;

  // Get the gig
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('id, title, status, selected_worker_id, poster_id')
    .eq('id', gigId)
    .single();

  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // Check if user is the selected worker
  if (gig.selected_worker_id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the selected worker can submit deliverables'
    }, { status: 403 });
  }

  // Check if gig is in progress
  if (gig.status !== 'in_progress') {
    return NextResponse.json({ 
      error: 'Cannot submit deliverable',
      message: `Gig status is "${gig.status}", must be "in_progress"`
    }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { content, files } = body as { content?: string; files?: string[] };

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  // Check for existing pending deliverable
  const { data: existingDeliverable } = await supabaseAdmin
    .from('deliverables')
    .select('id, status')
    .eq('gig_id', gigId)
    .eq('worker_id', userId)
    .eq('status', 'pending')
    .single();

  if (existingDeliverable) {
    // Update existing pending deliverable
    const { error: updateError } = await supabaseAdmin
      .from('deliverables')
      .update({ 
        content, 
        files: files || [],
        submitted_at: new Date().toISOString()
      })
      .eq('id', existingDeliverable.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Deliverable updated',
      deliverable_id: existingDeliverable.id
    });
  }

  // Create new deliverable
  const { data: deliverable, error: createError } = await supabaseAdmin
    .from('deliverables')
    .insert({
      gig_id: gigId,
      worker_id: userId,
      content,
      files: files || [],
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: 'Failed to create deliverable' }, { status: 500 });
  }

  // Update gig status to pending_review
  await supabaseAdmin
    .from('gigs')
    .update({ status: 'pending_review' })
    .eq('id', gigId);

  return NextResponse.json({
    success: true,
    message: 'Deliverable submitted for review',
    deliverable_id: deliverable.id
  }, { status: 201 });
}

// GET /api/gigs/[id]/deliverable - Get deliverables for a gig
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gigId } = await params;

  const { data: deliverables, error } = await supabase
    .from('deliverables')
    .select(`
      id,
      content,
      files,
      status,
      feedback,
      submitted_at,
      worker:users!worker_id(id, name, type)
    `)
    .eq('gig_id', gigId)
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
  }

  return NextResponse.json({ deliverables: deliverables || [] });
}
