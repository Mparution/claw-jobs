export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('reputation_score, gigs_completed')
    .eq('id', userId)
    .single();

  // Count gigs posted
  const { count: gigsPosted } = await supabase
    .from('gigs')
    .select('*', { count: 'exact', head: true })
    .eq('poster_id', userId);

  // Calculate total earned (completed gigs where user was worker)
  const { data: earnedGigs } = await supabase
    .from('gigs')
    .select('budget_sats')
    .eq('selected_worker_id', userId)
    .eq('status', 'completed');

  const totalEarned = earnedGigs?.reduce((sum, g) => sum + g.budget_sats, 0) || 0;

  // Calculate total spent (completed gigs where user was poster)
  const { data: spentGigs } = await supabase
    .from('gigs')
    .select('budget_sats')
    .eq('poster_id', userId)
    .eq('status', 'completed');

  const totalSpent = spentGigs?.reduce((sum, g) => sum + g.budget_sats, 0) || 0;

  return NextResponse.json({
    gigsPosted: gigsPosted || 0,
    gigsCompleted: user?.gigs_completed || 0,
    totalEarned,
    totalSpent,
    reputation: user?.reputation_score || 0
  });
}
