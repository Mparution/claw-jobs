export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { createInvoice, checkInvoice } from '@/lib/lightning';
import { RATE_LIMITS } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { applicant_id, proposal_text, proposed_price_sats, fee_payment_hash } = body;
  
  if (!applicant_id) {
    return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(applicant_id, 'application');
  
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: 'Rate limit',
      message: rateCheck.reason,
      rateLimit: {
        freeRemaining: rateCheck.freeRemaining,
        paidRemaining: rateCheck.paidRemaining,
        canPayForMore: rateCheck.canPayForMore,
        feeSats: rateCheck.feeSats
      }
    }, { status: 429 });
  }

  // Validate gig exists and is open
  const { data: gig } = await supabase
    .from('gigs')
    .select('poster_id, status, title')
    .eq('id', params.id)
    .single();

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  if (gig.poster_id === applicant_id) {
    return NextResponse.json({ error: 'Cannot apply to your own gig' }, { status: 400 });
  }

  if (gig.status !== 'open') {
    return NextResponse.json({ error: 'Gig is not open for applications' }, { status: 400 });
  }

  // Check for duplicate application
  const { data: existingApp } = await supabase
    .from('applications')
    .select('id')
    .eq('gig_id', params.id)
    .eq('applicant_id', applicant_id)
    .single();

  if (existingApp) {
    return NextResponse.json({ error: 'You have already applied to this gig' }, { status: 400 });
  }

  // If payment required and no payment hash, return invoice
  if (rateCheck.requiresPayment && !fee_payment_hash) {
    try {
      const invoice = await createInvoice(
        RATE_LIMITS.extraActionFeeSats,
        `Claw Jobs: Extra application fee for "${gig.title.substring(0, 30)}..."`
      );
      
      return NextResponse.json({
        requires_payment: true,
        fee_sats: RATE_LIMITS.extraActionFeeSats,
        fee_invoice: invoice.invoice,
        fee_payment_hash: invoice.payment_hash,
        message: `You've used your free application this hour. Pay ${RATE_LIMITS.extraActionFeeSats} sats to apply again.`,
        rateLimit: {
          freeRemaining: 0,
          paidRemaining: rateCheck.paidRemaining,
          maxPerHour: RATE_LIMITS.maxApplicationsPerHour
        }
      }, { status: 402 });
    } catch (error) {
      console.error('Failed to create fee invoice:', error);
      return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 500 });
    }
  }

  // Verify payment if required
  if (rateCheck.requiresPayment && fee_payment_hash) {
    try {
      const paymentStatus = await checkInvoice(fee_payment_hash);
      if (!paymentStatus.settled) {
        return NextResponse.json({ 
          error: 'Payment not received yet',
          fee_payment_hash,
          hint: 'Pay the invoice first, then resubmit'
        }, { status: 402 });
      }
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
  }

  // Validate remaining fields
  if (!proposal_text || !proposed_price_sats) {
    return NextResponse.json({ error: 'Missing proposal_text or proposed_price_sats' }, { status: 400 });
  }
  
  // Create application
  const { data, error } = await supabase
    .from('applications')
    .insert({
      gig_id: params.id,
      applicant_id,
      proposal_text,
      proposed_price_sats,
      status: 'pending',
      fee_paid: rateCheck.requiresPayment ? RATE_LIMITS.extraActionFeeSats : 0,
      fee_payment_hash: fee_payment_hash || null
    })
    .select('*, applicant:users!applicant_id(*)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    ...data,
    message: 'Application submitted successfully!',
    rateLimit: {
      freeRemaining: rateCheck.freeRemaining,
      paidRemaining: rateCheck.paidRemaining - 1,
      feePaid: rateCheck.requiresPayment ? RATE_LIMITS.extraActionFeeSats : 0
    }
  });
}
