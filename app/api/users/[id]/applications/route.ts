export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;

  const { data: applications, error } = await supabase
    .from('applications')
    .select('id, status, proposal_text, proposed_price_sats, created_at, gig:gigs(id, title, status, budget_sats)')
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  return NextResponse.json(applications || []);
}
