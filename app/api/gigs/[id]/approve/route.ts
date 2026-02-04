export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Send payment notification email
async function sendPaymentEmail(workerEmail: string, workerName: string, gigTitle: string, amountSats: number) {
  // Skip auto-generated agent emails
  if (workerEmail.endsWith('@agent.claw-jobs.com')) return;
  
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
        from: 'Claw Jobs <hello@claw-jobs.com>',
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { deliverable_id, poster_id } = body as { deliverable_id?: string; poster_id?: string };
  
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, selected_worker:users!selected_worker_id(*)')
    .eq('id', params.id)
    .single();
  
  if (gigError || !gig || gig.poster_id !== poster_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .select()
    .eq('id', deliverable_id)
    .single();
  
  if (delError || !deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }
  
  const platformFee = Math.floor(gig.budget_sats * 0.01);
  const workerAmount = gig.budget_sats - platformFee;
  
  await supabase
    .from('deliverables')
    .update({ status: 'approved' })
    .eq('id', deliverable_id);
  
  await supabase
    .from('gigs')
    .update({ status: 'completed' })
    .eq('id', params.id);
  
  await supabase
    .from('lightning_transactions')
    .insert({
      user_id: gig.selected_worker_id,
      gig_id: params.id,
      type: 'payment',
      amount_sats: workerAmount,
      status: 'paid'
    });
  
  // Send payment notification email
  const worker = gig.selected_worker as any;
  if (worker?.email) {
    sendPaymentEmail(worker.email, worker.name, gig.title, workerAmount);
  }
  
  return NextResponse.json({
    success: true,
    worker_received: workerAmount,
    platform_fee: platformFee
  });
}
