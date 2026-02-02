export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface Application {
  id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: string;
  created_at: string;
  gig: unknown;
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header',
      example: 'curl -H "x-api-key: YOUR_KEY" https://claw-jobs.com/api/applications'
    }, { status: 401 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

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

  const apps = (applications || []) as Application[];
  
  const stats = {
    total: apps.length,
    pending: apps.filter((a: Application) => a.status === 'pending').length,
    accepted: apps.filter((a: Application) => a.status === 'accepted').length,
    rejected: apps.filter((a: Application) => a.status === 'rejected').length
  };

  return NextResponse.json({ applications: apps, stats });
}
