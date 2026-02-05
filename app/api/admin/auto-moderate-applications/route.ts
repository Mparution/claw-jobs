export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

interface PendingApplication {
  id: string;
  gig_id: string;
  applicant_id: string;
  proposal_text: string;
  status: string;
  created_at: string;
  applicant: { id: string; name: string; type: string; gigs_completed: number };
  gig: { id: string; title: string; poster_id: string; status: string; is_testnet: boolean; selected_worker_id: string | null };
}

// POST /api/admin/auto-moderate-applications
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      return (error as { response: NextResponse }).response;
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    accepted: [] as string[],
    rejected: [] as string[],
    skipped: [] as string[],
    errors: [] as string[]
  };

  const { data: applications, error } = await supabaseAdmin
    .from('applications')
    .select(`
      id, gig_id, applicant_id, proposal_text, status, created_at,
      applicant:users!applicant_id(id, name, type, gigs_completed),
      gig:gigs!gig_id(id, title, poster_id, status, is_testnet, selected_worker_id)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  const apps = applications as unknown as PendingApplication[];
  const gigsWithWorkers = new Set<string>();

  for (const app of apps) {
    const gig = app.gig;
    const applicant = app.applicant;

    if (gig.selected_worker_id || gigsWithWorkers.has(gig.id)) {
      await supabaseAdmin.from('applications').update({ status: 'rejected' }).eq('id', app.id);
      results.rejected.push(`${applicant.name} → ${gig.title} (taken)`);
      continue;
    }

    if (gig.status !== 'open') {
      results.skipped.push(`${applicant.name} → ${gig.title} (not open)`);
      continue;
    }

    // Auto-accept testnet
    if (gig.is_testnet) {
      await acceptApp(app, gigsWithWorkers, results);
      continue;
    }

    // Mainnet: check quality
    const proposalOk = (app.proposal_text?.length || 0) > 50;
    const hasExperience = (applicant.gigs_completed || 0) > 0;
    
    if (proposalOk || hasExperience) {
      await acceptApp(app, gigsWithWorkers, results);
    } else {
      results.skipped.push(`${applicant.name} → ${gig.title} (manual review)`);
    }
  }

  return NextResponse.json({ success: true, summary: { accepted: results.accepted.length, rejected: results.rejected.length, skipped: results.skipped.length }, details: results });
}

async function acceptApp(app: PendingApplication, gigsWithWorkers: Set<string>, results: { accepted: string[]; rejected: string[]; skipped: string[]; errors: string[] }) {
  await supabaseAdmin.from('applications').update({ status: 'accepted' }).eq('id', app.id);
  await supabaseAdmin.from('gigs').update({ status: 'in_progress', selected_worker_id: app.applicant_id }).eq('id', app.gig_id);
  gigsWithWorkers.add(app.gig_id);
  results.accepted.push(`${app.applicant.name} → ${app.gig.title}`);
}

export async function GET(request: NextRequest) {
  try { await verifyAdmin(request); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { data } = await supabaseAdmin.from('applications').select('id', { count: 'exact' }).eq('status', 'pending');
  return NextResponse.json({ pending: data?.length || 0, endpoint: 'POST to auto-review' });
}
