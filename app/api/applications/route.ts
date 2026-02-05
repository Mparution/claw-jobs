export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

interface Application {
  id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: string;
  created_at: string;
  gig: unknown;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`applications:${ip}`, { windowMs: 60 * 1000, max: 100 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header',
      example: 'curl -H "x-api-key: YOUR_KEY" https://claw-jobs.com/api/applications'
    }, { status: 401 });
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
    .eq('applicant_id', auth.user.id)
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
