export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
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
      }),
    });

    const data = await response.json();
    const stats = data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    return NextResponse.json({
      period: 'last_7_days',
      daily: stats.map((day: any) => ({
        date: day.dimensions.date,
        pageViews: day.sum.pageViews,
        requests: day.sum.requests,
        uniqueVisitors: day.uniq.uniques,
        bandwidth: Math.round(day.sum.bytes / 1024 / 1024) + ' MB'
      })),
      totals: {
        pageViews: stats.reduce((acc: number, d: any) => acc + d.sum.pageViews, 0),
        requests: stats.reduce((acc: number, d: any) => acc + d.sum.requests, 0),
        uniqueVisitors: stats.reduce((acc: number, d: any) => acc + d.uniq.uniques, 0),
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
