export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { AGENT_EMAIL_DOMAIN, SENDER_FROM } from '@/lib/constants';
import { authenticateRequest } from '@/lib/auth';
import type { ApplicationWithRelations } from '@/types';

// Send notification email (fire and forget)
async function sendHiredEmail(applicantEmail: string, applicantName: string, gigTitle: string, gigId: string) {
  if (applicantEmail.endsWith(`@${AGENT_EMAIL_DOMAIN}`)) return;
  
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_FROM,
        to: applicantEmail,
        subject: `🎉 You've been hired for "${gigTitle}"!`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Congratulations, ${applicantName}! 🎉</h1>
            <p>Great news — you've been selected for the gig:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h2 style="margin-top: 0; color: #1e293b;">${gigTitle}</h2>
            </div>

            <h3>What's Next?</h3>
            <ol>
              <li>Start working on the gig</li>
              <li>Submit your deliverable when ready</li>
              <li>Get paid in Lightning sats! ⚡</li>
            </ol>

            <p>
              <a href="https://claw-jobs.com/gigs/${gigId}" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                View Gig Details →
              </a>
            </p>

            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              Good luck! 🚀
            </p>
            <p>— The Claw Jobs Team</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error('Hired email failed:', e);
  }
}

// PATCH /api/applications/[id] - Update application status (accept/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const userId = auth.user.id;

  // Get the application with gig info and applicant email
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select(`
      id,
      gig_id,
      applicant_id,
      status,
      applicant:users!applicant_id(id, name, email),
      gig:gigs(id, poster_id, title, status)
    `)
    .eq('id', id)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const gig = (Array.isArray(application.gig) ? application.gig[0] : application.gig) as ApplicationWithRelations['gig'];
  const applicant = (Array.isArray(application.applicant) ? application.applicant[0] : application.applicant) as ApplicationWithRelations['applicant'];
  
  if (gig.poster_id !== userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the gig poster can accept/reject applications'
    }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body;

  if (!status || !['accepted', 'rejected'].includes(status)) {
    return NextResponse.json({
      error: 'Invalid status',
      hint: 'Status must be "accepted" or "rejected"'
    }, { status: 400 });
  }

  if (status === 'accepted' && gig.status !== 'open') {
    return NextResponse.json({
      error: 'Cannot accept application',
      message: 'This gig is no longer open'
    }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  if (status === 'accepted') {
    await supabaseAdmin
      .from('gigs')
      .update({ 
        status: 'in_progress',
        selected_worker_id: application.applicant_id
      })
      .eq('id', application.gig_id);
      
    await supabaseAdmin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('gig_id', application.gig_id)
      .neq('id', id)
      .eq('status', 'pending');
    
    sendHiredEmail(applicant.email, applicant.name, gig.title, gig.id);
  }

  return NextResponse.json({
    success: true,
    message: `Application ${status}`,
    application: { id, status }
  });
}

// GET /api/applications/[id] - Get single application details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const { data: application, error } = await supabase
    .from('applications')
    .select(`
      id,
      proposal_text,
      proposed_price_sats,
      status,
      created_at,
      applicant:users!applicant_id(id, name, type, reputation_score, total_gigs_completed),
      gig:gigs(id, title, budget_sats, status, poster:users!poster_id(id, name))
    `)
    .eq('id', id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  return NextResponse.json({ application });
}
