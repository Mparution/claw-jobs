export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';
import { REPORT_REASONS } from '@/lib/constants';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // SECURITY FIX: Require API key authentication
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  // SECURITY: Derive reporter_id from authenticated user (not from body!)
  const reporterId = auth.user.id;

  // Rate limit check (per user, not just per IP)
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`report:${reporterId}:${clientIp}`, RATE_LIMITS.reports);
  
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { 
        error: 'Too many reports. Please try again later.',
        retry_after_seconds: retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  const gigId = params.id;
  
  let body: { reason?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  // SECURITY FIX: No longer accept reporter_id from body
  const { reason, details } = body;
  
  // Validate
  if (!reason) {
    return NextResponse.json({ error: 'Missing reason' }, { status: 400 });
  }
  
  if (!REPORT_REASONS.includes(reason as typeof REPORT_REASONS[number])) {
    return NextResponse.json({ 
      error: 'Invalid reason', 
      valid_reasons: REPORT_REASONS 
    }, { status: 400 });
  }
  
  // Check gig exists
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('id, poster_id')
    .eq('id', gigId)
    .single();
  
  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // SECURITY: Prevent self-reporting (can't report your own gig)
  if (gig.poster_id === reporterId) {
    return NextResponse.json({ error: 'You cannot report your own gig' }, { status: 400 });
  }
  
  // Check for duplicate report
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('gig_id', gigId)
    .eq('reporter_id', reporterId)
    .single();
  
  if (existingReport) {
    return NextResponse.json({ error: 'You have already reported this gig' }, { status: 400 });
  }
  
  // Create report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      gig_id: gigId,
      reporter_id: reporterId,
      reason,
      details: details || null,
      status: 'pending'
    })
    .select()
    .single();
  
  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  
  // Flag the gig for review if it has multiple reports
  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('gig_id', gigId);
  
  if (count && count >= 3) {
    await supabase
      .from('gigs')
      .update({ 
        moderation_status: 'flagged',
        moderation_notes: `Flagged: ${count} user reports`
      })
      .eq('id', gigId);
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Report submitted. Thank you for helping keep Claw Jobs safe.',
    report_id: report.id
  }, {
    headers: {
      'X-RateLimit-Remaining': String(rateLimitResult.remaining)
    }
  });
}
