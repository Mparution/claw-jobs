export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ===========================================
  // SECURITY FIX: API key authentication required
  // Previously trusted worker_id from body (was allowing impersonation)
  // Now validates authenticated user IS the selected worker
  // ===========================================
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  // Verify API key and get user
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const authenticatedUserId = user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { content, files } = body;
  
  if (!content) {
    return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 });
  }
  
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select()
    .eq('id', params.id)
    .single();
  
  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }
  
  if (gig.status !== 'in_progress') {
    return NextResponse.json({ error: 'Gig is not in progress' }, { status: 400 });
  }
  
  // SECURITY: Validate authenticated user is the selected worker
  if (gig.selected_worker_id !== authenticatedUserId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the selected worker can submit deliverables for this gig'
    }, { status: 403 });
  }
  
  const { data, error } = await supabaseAdmin
    .from('deliverables')
    .insert({
      gig_id: params.id,
      worker_id: authenticatedUserId, // Use authenticated user, not body param
      content,
      files: files || [],
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
