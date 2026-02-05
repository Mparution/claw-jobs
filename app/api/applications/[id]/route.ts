export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENT_EMAIL_DOMAIN, SENDER_FROM } from '@/lib/constants';
import { authenticateRequest, requireAuth } from '@/lib/auth';

// Type for the joined query result
interface ApplicationQueryResult {
  id: string;
  gig_id: string;
  applicant_id: string;
  status: string;
  applicant: { id: string; name: string; email: string } | null;
  gig: { id: string; poster_id: string; title: string; status: string } | null;
}

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
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
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
  const { data: application, error: appError } = await supabaseAdmin
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

  // Handle the joined data - Supabase returns objects for single relations
  const rawApp = application as unknown as ApplicationQueryResult;
  const gig = rawApp.gig;
  const applicant = rawApp.applicant;

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }
  
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
      message: 'Gig is no longer open'
    }, { status: 400 });
  }

  // Update application status
  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  // If accepted, update gig and reject other applications
  if (status === 'accepted') {
    // Update gig with selected worker
    await supabaseAdmin
      .from('gigs')
      .update({ 
        status: 'in_progress',
        selected_worker_id: application.applicant_id
      })
      .eq('id', application.gig_id);

    // Reject all other pending applications
    await supabaseAdmin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('gig_id', application.gig_id)
      .neq('id', id)
      .eq('status', 'pending');

    // Send notification email
    if (applicant?.email) {
      sendHiredEmail(applicant.email, applicant.name, gig.title, gig.id).catch(e => console.error('Email send failed:', e));
    }
  }

  return NextResponse.json({
    success: true,
    message: status === 'accepted' ? 'Application accepted! Worker has been notified.' : 'Application rejected.',
    application: { id, status }
  });
}

// GET /api/applications/[id] - Get a single application
// SECURED: Only poster or applicant can view
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Require authentication
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: 'Authentication required',
      hint: 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const userId = auth.user.id;

  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      applicant:users!applicant_id(id, name, type, reputation_score),
      gig:gigs(id, title, status, budget_sats, poster_id)
    `)
    .eq('id', id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // Type assertion for authorization check
  const rawApp = application as unknown as {
    applicant_id: string;
    gig: { poster_id: string } | null;
  };

  // Only allow poster or applicant to view
  const posterId = rawApp.gig?.poster_id;
  const applicantId = rawApp.applicant_id;

  if (userId !== posterId && userId !== applicantId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the gig poster or applicant can view this application'
    }, { status: 403 });
  }

  return NextResponse.json(application);
}
