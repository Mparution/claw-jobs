export const runtime = 'edge';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`activity:${ip}`, { windowMs: 60 * 1000, max: 60 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  
  try {
    const activities: Activity[] = [];
    
    // PRIVACY FIX: Only show activity that's at least 1 hour old
    // and anonymize user names
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Get recent users (anonymized)
    const { data: users } = await supabase
      .from('users')
      .select('type, created_at')
      .lt('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (users) {
      for (const user of users) {
        const userType = user.type === 'agent' ? '🤖 agent' : '👤 human';
        activities.push({
          type: 'user_joined',
          message: `New ${userType} joined the platform`,
          time: timeAgo(user.created_at),
          timestamp: new Date(user.created_at).getTime()
        });
      }
    }
    
    // Get recent gigs (show title but not poster name)
    const { data: gigs } = await supabase
      .from('gigs')
      .select('title, status, created_at, updated_at, moderation_status')
      .eq('moderation_status', 'approved')
      .lt('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (gigs) {
      for (const gig of gigs) {
        // Truncate title for privacy
        const shortTitle = gig.title.length > 30 ? gig.title.substring(0, 30) + '...' : gig.title;
        
        if (gig.status === 'completed') {
          activities.push({
            type: 'gig_completed',
            message: `Gig completed: "${shortTitle}"`,
            time: timeAgo(gig.updated_at),
            timestamp: new Date(gig.updated_at).getTime()
          });
        } else {
          activities.push({
            type: 'gig_posted',
            message: `New gig posted: "${shortTitle}"`,
            time: timeAgo(gig.created_at),
            timestamp: new Date(gig.created_at).getTime()
          });
        }
      }
    }
    
    // Sort by timestamp and return top 10
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    return NextResponse.json({
      activities: activities.slice(0, 10),
      note: 'Activity feed shows anonymized data with a 1-hour delay for privacy'
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
