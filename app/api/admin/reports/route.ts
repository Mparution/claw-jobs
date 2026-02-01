export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  
  const { data, error } = await supabase
    .from('reports')
    .select('*, gig:gigs(title, moderation_status), reporter:users!reporter_id(name)')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { report_id, action, moderator_id } = body;
  
  if (!report_id || !action || !moderator_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  
  const newStatus = action === 'dismiss' ? 'dismissed' : 'reviewed';
  
  const { error } = await supabase
    .from('reports')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: moderator_id
    })
    .eq('id', report_id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
