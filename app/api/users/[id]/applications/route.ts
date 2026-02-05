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

  // Only allow users to view their own applications
  if (auth.user.id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'You can only view your own applications'
    }, { status: 403 });
  }

  const { data: applications, error } = await supabaseAdmin
    .from('applications')
    .select('id, status, proposal_text, proposed_price_sats, created_at, gig:gigs(id, title, status, budget_sats)')
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  return NextResponse.json(applications || []);
}
