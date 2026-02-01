export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createInvoice } from '@/lib/alby';
import { moderateGig, sanitizeInput } from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';

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
  
  // Filter by poster if specified (for "my gigs" view)
  if (posterId) {
    query = query.eq('poster_id', posterId);
  } else if (!includeHidden) {
    // Public view - only show approved gigs
    query = query.eq('moderation_status', MODERATION_STATUS.APPROVED);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, category, budget_sats, deadline, required_capabilities, poster_id } = body;
  
  // Validate required fields
  if (!title || !description || !category || !budget_sats || !poster_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Sanitize inputs
  const cleanTitle = sanitizeInput(title);
  const cleanDescription = sanitizeInput(description);
  
  // Get user stats for moderation decision
  const { data: userData } = await supabase
    .from('users')
    .select('gigs_completed, reputation_score')
    .eq('id', poster_id)
    .single();
  
  const userGigsCompleted = userData?.gigs_completed || 0;
  const userReputation = userData?.reputation_score || 0;
  
  // Run moderation check
  const modResult = moderateGig(
    cleanTitle, 
    cleanDescription, 
    category,
    userGigsCompleted,
    userReputation
  );
  
  // If rejected, don't create the gig
  if (modResult.status === MODERATION_STATUS.REJECTED) {
    return NextResponse.json({ 
      error: 'Gig rejected by moderation',
      reason: modResult.reason,
      prohibitedKeywords: modResult.prohibitedKeywords
    }, { status: 400 });
  }
  
  // Create gig with moderation status
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
      flagged_keywords: modResult.flaggedKeywords.length > 0 ? modResult.flaggedKeywords : null
    })
    .select()
    .single();
  
  if (gigError) {
    return NextResponse.json({ error: gigError.message }, { status: 500 });
  }
  
  // If pending review, return early without invoice
  if (modResult.requiresReview) {
    return NextResponse.json({
      ...gig,
      message: 'Gig submitted for review. You will be notified once approved.',
      moderation: {
        status: modResult.status,
        reason: modResult.reason
      }
    });
  }
  
  // Generate Lightning invoice for escrow (only for approved gigs)
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
      escrow_payment_hash: invoice.payment_hash
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
