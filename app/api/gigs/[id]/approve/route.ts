export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';
import { AGENT_EMAIL_DOMAIN, SENDER_FROM } from '@/lib/constants';

// Send payment notification email
async function sendPaymentEmail(workerEmail: string, workerName: string, gigTitle: string, amountSats: number) {
  // Skip auto-generated agent emails
  if (workerEmail.endsWith(`@${AGENT_EMAIL_DOMAIN}`)) return;
  
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
        to: workerEmail,
        subject: `⚡ Payment received: ${amountSats.toLocaleString()} sats!`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Payment Received! ⚡</h1>
            <p>Great work, ${workerName}!</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h2 style="margin-top: 0; color: #166534;">+${amountSats.toLocaleString()} sats</h2>
              <p style="margin-bottom: 0; color: #15803d;">For: ${gigTitle}</p>
            </div>

            <p>Your deliverable has been approved and payment has been processed.</p>

            <h3>What's Next?</h3>
            <ul>
              <li>Browse more gigs to keep earning</li>
              <li>Build your reputation with completed gigs</li>
              <li>Withdraw to your Lightning wallet anytime</li>
            </ul>

            <p>
              <a href="https://claw-jobs.com/gigs" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                Find More Gigs →
              </a>
            </p>

            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              Thanks for being part of Claw Jobs! 🚀
            </p>
            <p>— The Claw Jobs Team</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error('Payment email failed:', e);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ===========================================
  // SECURITY FIX: Use proper API key authentication
  // instead of trusting client-provided poster_id
  // ===========================================
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token'
    }, { status: 401 });
  }

  const authenticatedUserId = auth.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { deliverable_id } = body as { deliverable_id?: string };

  if (!deliverable_id) {
    return NextResponse.json({ error: 'deliverable_id is required' }, { status: 400 });
  }
  
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, selected_worker:users!selected_worker_id(*)')
    .eq('id', params.id)
    .single();
  
  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  // SECURITY: Verify authenticated user is the gig poster
  if (gig.poster_id !== authenticatedUserId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Only the gig poster can approve deliverables'
    }, { status: 403 });
  }
  
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .select()
    .eq('id', deliverable_id)
    .eq('gig_id', params.id) // Ensure deliverable belongs to this gig
    .single();
  
  if (delError || !deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  // Verify deliverable is pending
  if (deliverable.status !== 'pending') {
    return NextResponse.json({ 
      error: 'Invalid deliverable status',
      message: `Deliverable is "${deliverable.status}", must be "pending"`
    }, { status: 400 });
  }
  
  const platformFee = Math.floor(gig.budget_sats * 0.01);
  const workerAmount = gig.budget_sats - platformFee;
  
  // Use supabaseAdmin for updates to bypass RLS
  await supabaseAdmin
    .from('deliverables')
    .update({ status: 'approved' })
    .eq('id', deliverable_id);
  
  await supabaseAdmin
    .from('gigs')
    .update({ status: 'completed' })
    .eq('id', params.id);
  
  await supabaseAdmin
    .from('lightning_transactions')
    .insert({
      user_id: gig.selected_worker_id,
      gig_id: params.id,
      type: 'payment',
      amount_sats: workerAmount,
      status: 'paid'
    });
  
  // Send payment notification email
  const worker = gig.selected_worker as { name: string; email: string } | null;
  if (worker?.email) {
    sendPaymentEmail(worker.email, worker.name, gig.title, workerAmount);
  }
  
  return NextResponse.json({
    success: true,
    message: 'Deliverable approved and payment processed',
    worker_received: workerAmount,
    platform_fee: platformFee
  });
}
