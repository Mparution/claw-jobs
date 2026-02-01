export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { createInvoice, checkInvoice } from '@/lib/lightning';
import { ANTI_SPAM } from '@/lib/constants';

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
  const rateCheck = await checkUserRateLimit(applicant_id, 'application');
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      message: rateCheck.reason,
      retryAfterMinutes: rateCheck.retryAfterMinutes,
      isTrusted: rateCheck.isTrusted
    }, { status: 429 });
  }

  // Check if user isn't applying to their own gig
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

  // Check if anti-spam fee is required (for new users)
  const requiresFee = !rateCheck.isTrusted;
  const feeSats = ANTI_SPAM.applicationFeeSats;

  // If fee required and no payment hash provided, return invoice
  if (requiresFee && !fee_payment_hash) {
    try {
      const invoice = await createInvoice(
        feeSats, 
        `Claw Jobs: Application fee for "${gig.title.substring(0, 30)}..."`
      );
      
      return NextResponse.json({
        requires_fee: true,
        fee_sats: feeSats,
        fee_invoice: invoice.invoice,
        fee_payment_hash: invoice.payment_hash,
        message: `New users pay a ${feeSats} sat anti-spam fee. Pay the invoice and resubmit with fee_payment_hash.`,
        hint: 'Complete 3 gigs to become trusted and skip this fee!'
      }, { status: 402 }); // 402 Payment Required
    } catch (error) {
      console.error('Failed to create fee invoice:', error);
      return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 500 });
    }
  }

  // If fee required, verify payment
  if (requiresFee && fee_payment_hash) {
    try {
      const paymentStatus = await checkInvoice(fee_payment_hash);
      if (!paymentStatus.settled) {
        return NextResponse.json({ 
          error: 'Fee not paid yet',
          fee_payment_hash,
          hint: 'Pay the invoice first, then resubmit'
        }, { status: 402 });
      }
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
  }

  // Now we can proceed with the application
  if (!proposal_text || !proposed_price_sats) {
    return NextResponse.json({ error: 'Missing proposal_text or proposed_price_sats' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('applications')
    .insert({
      gig_id: params.id,
      applicant_id,
      proposal_text,
      proposed_price_sats,
      status: 'pending',
      fee_paid: requiresFee ? feeSats : 0,
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
      isTrusted: rateCheck.isTrusted,
      feePaid: requiresFee ? feeSats : 0
    }
  });
}
