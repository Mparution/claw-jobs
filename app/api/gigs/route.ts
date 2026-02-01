export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createInvoice, checkInvoice } from '@/lib/lightning';
import { moderateGig, sanitizeInput } from '@/lib/moderation';
import { MODERATION_STATUS, RATE_LIMITS } from '@/lib/constants';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const posterId = searchParams.get('poster_id');
  const includeHidden = searchParams.get('includeHidden') === 'true';
  
  let query = supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .order('created_at', { ascending: false });
  
  if (posterId) {
    query = query.eq('poster_id', posterId);
  } else if (!includeHidden) {
    query = query.eq('moderation_status', MODERATION_STATUS.APPROVED);
  }
  
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, category, budget_sats, deadline, required_capabilities, poster_id, fee_payment_hash } = body;
  
  if (!title || !description || !category || !budget_sats || !poster_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(poster_id, 'gig');
  
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

  // If payment required and no payment hash, return invoice
  if (rateCheck.requiresPayment && !fee_payment_hash) {
    try {
      const invoice = await createInvoice(
        RATE_LIMITS.extraActionFeeSats,
        `Claw Jobs: Extra gig post fee`
      );
      
      return NextResponse.json({
        requires_payment: true,
        fee_sats: RATE_LIMITS.extraActionFeeSats,
        fee_invoice: invoice.invoice,
        fee_payment_hash: invoice.payment_hash,
        message: `You've used your free post this hour. Pay ${RATE_LIMITS.extraActionFeeSats} sats to post another.`,
        rateLimit: {
          freeRemaining: 0,
          paidRemaining: rateCheck.paidRemaining,
          maxPerHour: RATE_LIMITS.maxGigsPerHour
        }
      }, { status: 402 });
    } catch (error) {
      console.error('Failed to create fee invoice:', error);
      return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 500 });
    }
  }

  // If payment required, verify it
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
  
  // Sanitize inputs
  const cleanTitle = sanitizeInput(title);
  const cleanDescription = sanitizeInput(description);
  
  // Get user stats for moderation
  const { data: userData } = await supabase
    .from('users')
    .select('gigs_completed, reputation_score')
    .eq('id', poster_id)
    .single();
  
  const userGigsCompleted = userData?.gigs_completed || 0;
  const userReputation = userData?.reputation_score || 0;
  
  // Run moderation check
  const modResult = moderateGig(cleanTitle, cleanDescription, category, userGigsCompleted, userReputation);
  
  if (modResult.status === MODERATION_STATUS.REJECTED) {
    return NextResponse.json({ 
      error: 'Gig rejected by moderation',
      reason: modResult.reason,
      prohibitedKeywords: modResult.prohibitedKeywords
    }, { status: 400 });
  }
  
  // Create gig
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .insert({
      poster_id,
      title: cleanTitle,
      description: cleanDescription,
      category,
      budget_sats,
      deadline,
      required_capabilities: required_capabilities || [],
      status: modResult.status === MODERATION_STATUS.APPROVED ? 'open' : 'pending_review',
      moderation_status: modResult.status,
      moderation_notes: modResult.reason || null,
      flagged_keywords: modResult.flaggedKeywords.length > 0 ? modResult.flaggedKeywords : null,
      fee_paid: rateCheck.requiresPayment ? RATE_LIMITS.extraActionFeeSats : 0,
      fee_payment_hash: fee_payment_hash || null
    })
    .select()
    .single();
  
  if (gigError) {
    return NextResponse.json({ error: gigError.message }, { status: 500 });
  }
  
  // Generate escrow invoice for approved gigs
  if (!modResult.requiresReview) {
    try {
      const invoice = await createInvoice(budget_sats, `Escrow for gig: ${cleanTitle}`);
      
      await supabase
        .from('gigs')
        .update({
          escrow_invoice: invoice.invoice,
          escrow_payment_hash: invoice.payment_hash
        })
        .eq('id', gig.id);
      
      return NextResponse.json({
        ...gig,
        escrow_invoice: invoice.invoice,
        escrow_payment_hash: invoice.payment_hash,
        rateLimit: {
          freeRemaining: rateCheck.freeRemaining,
          paidRemaining: rateCheck.paidRemaining - 1,
          feePaid: rateCheck.requiresPayment ? RATE_LIMITS.extraActionFeeSats : 0
        }
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    ...gig,
    message: 'Gig submitted for review.',
    rateLimit: {
      freeRemaining: rateCheck.freeRemaining,
      paidRemaining: rateCheck.paidRemaining - 1
    }
  });
}
