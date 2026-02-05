export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const authenticatedUserId = auth.user.id;

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
      worker_id: authenticatedUserId,
      content,
      files: files || [],
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
