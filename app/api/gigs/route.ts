export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { createInvoice, isTestnetMode } from '@/lib/lightning';
import { moderateGig, sanitizeInput } from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';
import { authenticateRequest } from '@/lib/auth';

interface CreateGigRequest {
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  deadline?: string;
  required_capabilities?: string[];
}

// Rate limits: 21 min for mainnet, 10 min for testnet
const MAINNET_COOLDOWN_MS = 21 * 60 * 1000;
const TESTNET_COOLDOWN_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const posterId = searchParams.get('poster_id');
  const includeHidden = searchParams.get('includeHidden') === 'true';
  const network = searchParams.get('network');
  
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
  
  if (network === 'testnet') {
    query = query.eq('is_testnet', true);
  } else if (network === 'mainnet') {
    query = query.eq('is_testnet', false);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to fetch gigs" }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // ===========================================
  // AUTHENTICATION - Using centralized auth (supports hashed + legacy keys)
  // ===========================================
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header or Bearer token',
      example: 'curl -H "x-api-key: YOUR_KEY" -X POST https://claw-jobs.com/api/gigs'
    }, { status: 401 });
  }

  const user = auth.user;
  const poster_id = user.id;

  let body: CreateGigRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  const { title, description, category, budget_sats, deadline, required_capabilities } = body;
  const is_testnet = isTestnetMode();
  
  if (!title || !description || !category || !budget_sats) {
    return NextResponse.json({ error: 'Missing required fields: title, description, category, budget_sats' }, { status: 400 });
  }

  // Check rate limit
  const { data: lastGig } = await supabaseAdmin
    .from('gigs')
    .select('created_at')
    .eq('poster_id', poster_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastGig) {
    const lastPostTime = new Date(lastGig.created_at).getTime();
    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    const cooldownMs = is_testnet ? TESTNET_COOLDOWN_MS : MAINNET_COOLDOWN_MS;
    const cooldownMinutes = is_testnet ? 10 : 21;
    
    if (timeSinceLastPost < cooldownMs) {
      const waitTimeMs = cooldownMs - timeSinceLastPost;
      const waitMinutes = Math.ceil(waitTimeMs / 60000);
      
      return NextResponse.json({
        error: 'Rate limit',
        message: `You can only post once every ${cooldownMinutes} minutes. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
        waitMs: waitTimeMs,
        waitMinutes: waitMinutes
      }, { status: 429 });
    }
  }
  
  const cleanTitle = sanitizeInput(title);
  const cleanDescription = sanitizeInput(description);
  const userGigsCompleted = user.gigs_completed || 0;
  const userReputation = user.reputation_score || 0;
  
  const modResult = moderateGig(cleanTitle, cleanDescription, category, userGigsCompleted, userReputation);
  
  if (modResult.status === MODERATION_STATUS.REJECTED) {
    return NextResponse.json({ 
      error: 'Gig rejected by moderation',
      reason: modResult.reason,
      prohibitedKeywords: modResult.prohibitedKeywords
    }, { status: 400 });
  }
  
  const { data: gig, error: gigError } = await supabaseAdmin
    .from('gigs')
    .insert({
      poster_id,
      title: cleanTitle,
      description: cleanDescription,
      category,
      budget_sats,
      deadline,
      required_capabilities: required_capabilities || [],
      is_testnet,
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
  
  if (!modResult.requiresReview && !is_testnet) {
    try {
      const invoice = await createInvoice(budget_sats, `Escrow for gig: ${cleanTitle}`);
      
      await supabaseAdmin
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }
  
  if (is_testnet && !modResult.requiresReview) {
    await supabaseAdmin
      .from('gigs')
      .update({
        escrow_paid: true,
        escrow_invoice: 'testnet_simulated',
        escrow_payment_hash: `testnet_${gig.id}`
      })
      .eq('id', gig.id);
    
    return NextResponse.json({
      ...gig,
      escrow_paid: true,
      is_testnet: true,
      message: 'Testnet gig created! No real payment required.'
    });
  }
  
  return NextResponse.json({
    ...gig,
    message: modResult.requiresReview ? 'Gig submitted for review.' : 'Gig created.'
  });
}
