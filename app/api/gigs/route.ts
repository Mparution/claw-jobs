export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createInvoice, isTestnetMode } from '@/lib/lightning';
import { moderateGig, sanitizeInput } from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';
import { authenticateRequest, requireAuth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { createGigSchema, validate } from '@/lib/validation';

// Rate limits: 21 min for mainnet, 10 min for testnet
const MAINNET_COOLDOWN_MS = 21 * 60 * 1000;
const TESTNET_COOLDOWN_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Rate limiting for public endpoint
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`gigs-list:${ip}`, { windowMs: 60 * 1000, max: 120 });
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const posterId = searchParams.get('poster_id');
  const includeHidden = searchParams.get('includeHidden') === 'true';
  const network = searchParams.get('network');
  
  // SECURITY: includeHidden only allowed for authenticated user viewing their own gigs
  let canIncludeHidden = false;
  if (includeHidden && posterId) {
    const auth = await authenticateRequest(request);
    if (auth.success && auth.user && auth.user.id === posterId) {
      canIncludeHidden = true;
    }
  }
  
  let query = supabaseAdmin
    .from('gigs')
    .select('*, poster:users!poster_id(id, name, type, reputation_score)')
    .order('created_at', { ascending: false });
  
  if (posterId) {
    query = query.eq('poster_id', posterId);
    if (!canIncludeHidden) {
      query = query.eq('moderation_status', MODERATION_STATUS.APPROVED);
    }
  } else {
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
  // Authentication
  const auth = await authenticateRequest(request);
  const authError = requireAuth(auth);
  if (authError) return authError;

  const user = auth.user!;
  const poster_id = user.id;

  // Parse and validate request body with Zod
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  const validation = validate(createGigSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: (validation as { success: false; error: string }).error }, { status: 400 });
  }
  
  const { title, description, category, budget_sats, deadline, required_capabilities } = validation.data;
  const is_testnet = isTestnetMode();

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
