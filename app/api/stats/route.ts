export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeModeration = searchParams.get('moderation') === 'true';
  
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
    
    const stats: Record<string, any> = {
      total_gigs: totalGigs ?? 0,
      total_users: totalUsers ?? 0,
      open_gigs: openGigs ?? 0,
      completed_gigs: completedGigs ?? 0,
      total_volume_sats: volume,
      updated_at: new Date().toISOString()
    };
    
    // Add moderation stats if requested
    if (includeModeration) {
      const { count: pendingGigs } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending');
      
      const { count: flaggedGigs } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'flagged');
      
      const { count: rejectedGigs } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'rejected');
      
      const { count: pendingReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });
      
      stats.moderation = {
        pending_gigs: pendingGigs ?? 0,
        flagged_gigs: flaggedGigs ?? 0,
        rejected_gigs: rejectedGigs ?? 0,
        pending_reports: pendingReports ?? 0,
        total_reports: totalReports ?? 0
      };
    }
    
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
