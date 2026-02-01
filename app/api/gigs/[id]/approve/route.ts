export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { deliverable_id, poster_id } = body;
  
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, selected_worker:users!selected_worker_id(*)')
    .eq('id', params.id)
    .single();
  
  if (gigError || !gig || gig.poster_id !== poster_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .select()
    .eq('id', deliverable_id)
    .single();
  
  if (delError || !deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }
  
  const platformFee = Math.floor(gig.budget_sats * 0.01);
  const workerAmount = gig.budget_sats - platformFee;
  
  await supabase
    .from('deliverables')
    .update({ status: 'approved' })
    .eq('id', deliverable_id);
  
  await supabase
    .from('gigs')
    .update({ status: 'completed' })
    .eq('id', params.id);
  
  await supabase
    .from('lightning_transactions')
    .insert({
      user_id: gig.selected_worker_id,
      gig_id: params.id,
      type: 'payment',
      amount_sats: workerAmount,
      status: 'paid'
    });
  
  return NextResponse.json({
    success: true,
    worker_received: workerAmount,
    platform_fee: platformFee
  });
}
