export const runtime = 'edge';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`health:${ip}`, { windowMs: 60 * 1000, max: 300 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    // Check Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'error',
        error: error.message
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'unhealthy',
      error: message
    }, { status: 503 });
  }
}
