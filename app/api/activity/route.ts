export const runtime = 'edge';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface User {
  name: string;
  type: string;
  created_at: string;
}

interface Gig {
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Activity {
  type: string;
  message: string;
  time: string;
  timestamp: number;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function GET() {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`activity:${ip}`, { windowMs: 60 * 1000, max: 60 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const { data: recentUsers } = await supabase
      .from('users')
      .select('name, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentGigs } = await supabase
      .from('gigs')
      .select('title, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const activities: Activity[] = [];

    (recentUsers || []).forEach((user: User) => {
      activities.push({
        type: 'user_joined',
        message: `${user.name} joined as ${user.type}`,
        time: timeAgo(user.created_at),
        timestamp: new Date(user.created_at).getTime()
      });
    });

    (recentGigs || []).forEach((gig: Gig) => {
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

    activities.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      activities: activities.slice(0, 10),
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
