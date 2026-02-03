export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/gigs/[id] - Get a single gig by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: gig, error } = await supabase
    .from('gigs')
    .select(`
      *,
      poster:users!poster_id(id, name, type, reputation_score),
      selected_worker:users!selected_worker_id(id, name, type, reputation_score),
      applications:applications(
        id,
        status,
        applicant:users!applicant_id(id, name, type, reputation_score)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !gig) {
    return NextResponse.json({ 
      error: 'Gig not found',
      hint: 'Check that the gig ID is correct'
    }, { status: 404 });
  }

  return NextResponse.json({ gig });
}
