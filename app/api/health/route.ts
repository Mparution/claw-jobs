export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
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
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
