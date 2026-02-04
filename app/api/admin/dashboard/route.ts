export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, AuthError } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (e) {
    if (e instanceof AuthError) return e.response;
    throw e;
  }

  const [usersRes, gigsRes, appsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact' }),
    supabaseAdmin.from('gigs').select('id', { count: 'exact' }),
    supabaseAdmin.from('applications').select('id', { count: 'exact' }),
  ]);

  const { data: pending } = await supabaseAdmin
    .from('applications')
    .select('id, proposal_text, status, created_at, applicant:users!applicant_id(name), gig:gigs(title, budget_sats)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const { data: feedback } = await supabaseAdmin
    .from('feedback')
    .select('id, from_name, message, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10);

  let issues: Array<{ number: number; title: string; state: string }> = [];
  try {
    const ghRes = await fetch('https://api.github.com/repos/Mparution/claw-jobs/issues?state=open&per_page=10');
    if (ghRes.ok) {
      const data = await ghRes.json();
      issues = data.map((i: { number: number; title: string; state: string }) => ({ 
        number: i.number, title: i.title, state: i.state 
      }));
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    stats: {
      users: usersRes.count || 0,
      gigs: gigsRes.count || 0,
      applications: appsRes.count || 0,
      pending: pending?.length || 0,
    },
    pending: pending || [],
    feedback: feedback || [],
    issues,
    updated_at: new Date().toISOString()
  });
}
