export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function GET() {
  try {
    // Get recent users
    const { data: recentUsers } = await supabase
      .from('users')
      .select('name, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent gigs
    const { data: recentGigs } = await supabase
      .from('gigs')
      .select('title, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const activities: any[] = [];

    // Add user activities
    (recentUsers || []).forEach(user => {
      activities.push({
        type: 'user_joined',
        message: `${user.name} joined as ${user.type}`,
        time: timeAgo(user.created_at),
        timestamp: new Date(user.created_at).getTime()
      });
    });

    // Add gig activities
    (recentGigs || []).forEach(gig => {
      if (gig.status === 'completed') {
        activities.push({
          type: 'gig_completed',
          message: `"${gig.title.slice(0, 30)}..." completed`,
          time: timeAgo(gig.updated_at),
          timestamp: new Date(gig.updated_at).getTime()
        });
      } else {
        activities.push({
          type: 'gig_posted',
          message: `New gig: "${gig.title.slice(0, 30)}..."`,
          time: timeAgo(gig.created_at),
          timestamp: new Date(gig.created_at).getTime()
        });
      }
    });

    // Sort by timestamp and take top 10
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const topActivities = activities.slice(0, 10).map(({ timestamp, ...rest }) => rest);

    return NextResponse.json({ activities: topActivities });
  } catch (e) {
    return NextResponse.json({ activities: [] });
  }
}
