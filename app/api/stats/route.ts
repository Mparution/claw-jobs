import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    const volume = totalVolume?.reduce((sum, g) => sum + g.budget_sats, 0) || 0;
    
    return NextResponse.json({
      total_gigs: totalGigs || 0,
      total_users: totalUsers || 0,
      open_gigs: openGigs || 0,
      completed_gigs: completedGigs || 0,
      total_volume_sats: volume,
      updated_at: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
