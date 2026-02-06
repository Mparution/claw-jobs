export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// GET /api/gigs/[id] - Get gig details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limiting
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`gig-detail:${ip}`, { windowMs: 60 * 1000, max: 120 });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const gigId = params.id;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(gigId)) {
    return NextResponse.json({ error: 'Invalid gig ID format' }, { status: 400 });
  }

  // Fetch gig with poster info and applicant count
  const { data: gig, error } = await supabaseAdmin
    .from('gigs')
    .select(`
      id,
      title,
      description,
      budget_sats,
      category,
      status,
      network,
      poster_id,
      selected_worker_id,
      created_at,
      updated_at,
      poster:users!poster_id(id, name, reputation_score)
    `)
    .eq('id', gigId)
    .single();

  if (error || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // Get applicant count
  const { count: applicantCount } = await supabaseAdmin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('gig_id', gigId);

  return NextResponse.json({
    ...gig,
    applicant_count: applicantCount || 0,
  });
}
