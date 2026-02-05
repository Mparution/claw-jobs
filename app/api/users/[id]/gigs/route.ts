export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  // Require authentication
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  // Only allow users to view their own gigs with full details
  // Others can only see public gig info (use /api/gigs instead)
  if (auth.user.id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'You can only view your own gigs via this endpoint. Use /api/gigs for public listings.'
    }, { status: 403 });
  }

  const { data: gigs, error } = await supabaseAdmin
    .from('gigs')
    .select('id, title, description, status, budget_sats, category, created_at, moderation_status, applications(id, status, applicant_id)')
    .eq('poster_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 });
  }

  return NextResponse.json(gigs || []);
}
