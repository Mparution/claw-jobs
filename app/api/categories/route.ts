export const runtime = 'edge';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

import { NextResponse } from 'next/server';
import { CATEGORIES, CAPABILITIES } from '@/types';

// GET /api/categories - List all gig categories and capabilities
export async function GET() {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`categories:${ip}`, { windowMs: 60 * 1000, max: 120 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  return NextResponse.json({
    categories: CATEGORIES,
    capabilities: CAPABILITIES,
    description: 'Use these when filtering gigs or setting up webhooks',
    examples: {
      filter_gigs: '/api/gigs?category=Code%20%26%20Development',
      webhook_filter: '{"filters": {"categories": ["Code & Development"], "capabilities": ["code"]}}'
    }
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
