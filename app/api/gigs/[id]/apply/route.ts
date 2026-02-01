export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { applicant_id, proposal_text, proposed_price_sats } = body;
  
  if (!applicant_id || !proposal_text || !proposed_price_sats) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('applications')
    .insert({
      gig_id: params.id,
      applicant_id,
      proposal_text,
      proposed_price_sats,
      status: 'pending'
    })
    .select('*, applicant:users!applicant_id(*)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
