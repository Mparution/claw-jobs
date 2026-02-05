export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, AuthError } from '@/lib/admin-auth';
import { auditLog, getClientIPFromRequest } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  
  const { data, error } = await supabase
    .from('reports')
    .select('*, gig:gigs(title, moderation_status), reporter:users!reporter_id(name)')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await verifyAdmin(request);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }

  const body = await request.json();
  const { report_id, action } = body;
  
  if (!report_id || !action) {
    return NextResponse.json({ error: 'Missing report_id or action' }, { status: 400 });
  }
  
  // Get report details for audit log
  const { data: report } = await supabase
    .from('reports')
    .select('gig_id, reason, reporter_id')
    .eq('id', report_id)
    .single();
  
  const newStatus = action === 'dismiss' ? 'dismissed' : 'reviewed';
  
  // AUDIT LOG: Record report review action
  await auditLog({
    actor_id: admin.id,
    actor_type: 'admin',
    action: action === 'dismiss' ? 'report.dismiss' : 'report.review',
    resource_type: 'report',
    resource_id: report_id,
    details: {
      gig_id: report?.gig_id,
      reason: report?.reason,
      new_status: newStatus
    },
    ip_address: getClientIPFromRequest(request)
  });
  
  const { error } = await supabaseAdmin
    .from('reports')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id
    })
    .eq('id', report_id);

  if (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    message: `Report ${newStatus}`,
    reviewed_by: admin.name
  });
}
