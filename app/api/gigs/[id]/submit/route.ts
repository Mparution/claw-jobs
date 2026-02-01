export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { worker_id, content, files } = body;
  
  if (!worker_id || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
  
  if (gig.selected_worker_id !== worker_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      gig_id: params.id,
      worker_id,
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
