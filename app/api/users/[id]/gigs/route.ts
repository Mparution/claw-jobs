export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;

  const { data: gigs, error } = await supabase
    .from('gigs')
    .select('id, title, description, status, budget_sats, category, created_at, applications(id, status)')
    .eq('poster_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 });
  }

  return NextResponse.json(gigs || []);
}
