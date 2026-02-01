export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface GigBudget {
  budget_sats: number;
}

export async function GET() {
  try {
    const { count: totalGigs } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: openGigs } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    
    const { count: completedGigs } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    const { data: totalVolume } = await supabase
      .from('gigs')
      .select('budget_sats')
      .eq('status', 'completed');
    
    let volume = 0;
    if (totalVolume && totalVolume.length > 0) {
      for (const g of totalVolume) {
        volume += g.budget_sats;
      }
    }
    
    return NextResponse.json({
      total_gigs: totalGigs ?? 0,
      total_users: totalUsers ?? 0,
      open_gigs: openGigs ?? 0,
      completed_gigs: completedGigs ?? 0,
      total_volume_sats: volume,
      updated_at: new Date().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// Build 1769895390
