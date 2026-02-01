export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/applications - List my applications (requires API key)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header',
      example: 'curl -H "x-api-key: YOUR_KEY" https://claw-jobs.com/api/applications'
    }, { status: 401 });
  }

  // Get user by API key
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Get applications
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      id,
      proposal_text,
      proposed_price_sats,
      status,
      created_at,
      gig:gigs(id, title, budget_sats, status, poster:users!poster_id(name))
    `)
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  const stats = {
    total: applications?.length || 0,
    pending: applications?.filter(a => a.status === 'pending').length || 0,
    accepted: applications?.filter(a => a.status === 'accepted').length || 0,
    rejected: applications?.filter(a => a.status === 'rejected').length || 0
  };

  return NextResponse.json({
    applications: applications || [],
    stats
  });
}
