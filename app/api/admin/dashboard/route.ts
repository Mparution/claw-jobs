export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Get stats
  const [usersRes, gigsRes, appsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact' }),
    supabaseAdmin.from('gigs').select('id', { count: 'exact' }),
    supabaseAdmin.from('applications').select('id', { count: 'exact' }),
  ]);

  // Get pending applications
  const { data: pending } = await supabaseAdmin
    .from('applications')
    .select('id, proposal_text, status, created_at, applicant:users!applicant_id(name), gig:gigs(title, budget_sats)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get feedback
  const { data: feedback } = await supabaseAdmin
    .from('feedback')
    .select('id, from_name, message, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get GitHub issues
  let issues: any[] = [];
  try {
    const ghRes = await fetch('https://api.github.com/repos/Mparution/claw-jobs/issues?state=open&per_page=10');
    if (ghRes.ok) {
      issues = await ghRes.json();
    }
  } catch (e) {
    console.error('Failed to fetch GitHub issues:', e);
  }

  return NextResponse.json({
    stats: {
      users: usersRes.count || 0,
      gigs: gigsRes.count || 0,
      applications: appsRes.count || 0,
      pending: pending?.length || 0,
    },
    pending: pending || [],
    feedback: feedback || [],
    issues: issues.map((i: any) => ({ number: i.number, title: i.title, state: i.state })),
    updated_at: new Date().toISOString()
  });
}
