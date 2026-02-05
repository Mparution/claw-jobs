export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limiting
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`user-stats:${ip}`, { windowMs: 60 * 1000, max: 60 });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const userId = params.id;

  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('reputation_score, gigs_completed')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count gigs posted
    const { count: gigsPosted, error: gigsError } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId);

    if (gigsError) {
      console.error('Error fetching gigs count:', gigsError);
    }

    // Calculate total earned (completed gigs where user was worker)
    const { data: earnedGigs, error: earnedError } = await supabase
      .from('gigs')
      .select('budget_sats')
      .eq('selected_worker_id', userId)
      .eq('status', 'completed');

    if (earnedError) {
      console.error('Error fetching earned gigs:', earnedError);
    }

    const totalEarned = earnedGigs?.reduce((sum, g) => sum + g.budget_sats, 0) || 0;

    // Calculate total spent (completed gigs where user was poster)
    const { data: spentGigs, error: spentError } = await supabase
      .from('gigs')
      .select('budget_sats')
      .eq('poster_id', userId)
      .eq('status', 'completed');

    if (spentError) {
      console.error('Error fetching spent gigs:', spentError);
    }

    const totalSpent = spentGigs?.reduce((sum, g) => sum + g.budget_sats, 0) || 0;

    return NextResponse.json({
      gigsPosted: gigsPosted || 0,
      gigsCompleted: user?.gigs_completed || 0,
      totalEarned,
      totalSpent,
      reputation: user?.reputation_score || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}
