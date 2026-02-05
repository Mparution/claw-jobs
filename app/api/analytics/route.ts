export const runtime = 'edge';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AuthError } from '@/lib/admin-auth';

// Cloudflare Analytics API response types
interface CloudflareDayStats {
  dimensions: { date: string };
  sum: { requests: number; pageViews: number; bytes: number };
  uniq: { uniques: number };
}

export async function GET(request: NextRequest) {
  // SECURITY FIX: Require admin auth for analytics data
  const adminAuth = await verifyAdmin(request);
  if (adminAuth instanceof AuthError) {
    return adminAuth.response;
  }

  const ip = getClientIP(request);
  const { allowed } = rateLimit(`analytics:${ip}`, { windowMs: 60 * 1000, max: 30 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  
  const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const ZONE_ID = '95e9346ecc4ce1f83f3176b597a87c9a';
  
  if (!CF_TOKEN) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
          viewer {
            zones(filter: {zoneTag: "${ZONE_ID}"}) {
              httpRequests1dGroups(limit: 7, filter: {date_geq: "${weekAgo}"}) {
                dimensions { date }
                sum { requests pageViews bytes }
                uniq { uniques }
              }
            }
          }
        }`
      })
    });
    
    const result = await response.json();
    
    if (!result.data?.viewer?.zones?.[0]) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
    
    const stats = result.data.viewer.zones[0].httpRequests1dGroups as CloudflareDayStats[];
    
    // Calculate totals
    const totals = stats.reduce((acc, day) => ({
      requests: acc.requests + day.sum.requests,
      pageViews: acc.pageViews + day.sum.pageViews,
      bytes: acc.bytes + day.sum.bytes,
      uniques: acc.uniques + day.uniq.uniques
    }), { requests: 0, pageViews: 0, bytes: 0, uniques: 0 });
    
    return NextResponse.json({
      period: { from: weekAgo, to: today },
      totals: {
        ...totals,
        bytesFormatted: `${(totals.bytes / 1024 / 1024).toFixed(2)} MB`
      },
      daily: stats.map(day => ({
        date: day.dimensions.date,
        requests: day.sum.requests,
        pageViews: day.sum.pageViews,
        uniques: day.uniq.uniques
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
