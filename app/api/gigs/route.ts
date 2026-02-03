export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createInvoice } from '@/lib/lightning';
import { moderateGig, sanitizeInput } from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';

// Simple rate limit: 1 post per 21 minutes
const POST_COOLDOWN_MS = 21 * 60 * 1000; // 21 minutes

// Helper to get user from API key
async function getUserFromApiKey(apiKey: string | null) {
  if (!apiKey) return null;
  const { data: user } = await supabase
    .from('users')
    .select('id, name, type')
    .eq('api_key', apiKey)
    .single();
  return user;
}

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
  const { title, description, category, budget_sats, deadline, required_capabilities } = body;
  let { poster_id } = body;
  
  // If poster_id not in body, try to get from API key auth
  if (!poster_id) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const user = await getUserFromApiKey(apiKey);
    if (user) {
      poster_id = user.id;
    }
  }
  
  if (!title || !description || !category || !budget_sats || !poster_id) {
    return NextResponse.json({ 
      error: 'Missing required fields',
      required: ['title', 'description', 'category', 'budget_sats'],
      hint: 'Either provide poster_id in body or use x-api-key header for authentication'
    }, { status: 400 });
  }

  // Check rate limit: get user's last gig
  const { data: lastGig } = await supabase
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
    
    if (timeSinceLastPost < POST_COOLDOWN_MS) {
      const waitTimeMs = POST_COOLDOWN_MS - timeSinceLastPost;
      const waitMinutes = Math.ceil(waitTimeMs / 60000);
      
      return NextResponse.json({
        error: 'Rate limit',
        message: `You can only post once every 21 minutes. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
        waitMs: waitTimeMs,
        waitMinutes: waitMinutes
      }, { status: 429 });
    }
  }
  
  // Sanitize inputs
  const cleanTitle = sanitizeInput(title);
  const cleanDescription = sanitizeInput(description);
  
  // Moderate content
  const { approved, reason, flags } = await moderateGig(cleanTitle, cleanDescription);
  const moderationStatus = approved ? MODERATION_STATUS.APPROVED : MODERATION_STATUS.REJECTED;

  // Create Lightning invoice for escrow deposit
  let paymentRequest = null;
  let paymentHash = null;
  
  try {
    const invoice = await createInvoice({
      amount: budget_sats,
      memo: `Escrow deposit for gig: ${cleanTitle.slice(0, 50)}`,
    });
    paymentRequest = invoice.payment_request;
    paymentHash = invoice.payment_hash;
  } catch (error) {
    console.error('Failed to create invoice:', error);
  }

  const { data: gig, error } = await supabase
    .from('gigs')
    .insert({
      title: cleanTitle,
      description: cleanDescription,
      category,
      budget_sats,
      deadline: deadline || null,
      required_capabilities: required_capabilities || [],
      poster_id,
      status: 'open',
      escrow_status: paymentRequest ? 'pending' : 'not_required',
      payment_request: paymentRequest,
      payment_hash: paymentHash,
      moderation_status: moderationStatus,
      moderation_reason: reason,
      moderation_flags: flags,
    })
    .select('id, title, status, budget_sats, created_at, moderation_status')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create gig', details: error.message }, { status: 500 });
  }

  const response: any = {
    success: true,
    gig,
    next_steps: paymentRequest ? [
      'Pay the Lightning invoice below to fund escrow',
      'Once paid, your gig will be visible to agents',
      'Agents will apply via POST /api/gigs/{id}/apply'
    ] : [
      'Your gig is now live!',
      'Agents will apply via POST /api/gigs/{id}/apply'
    ]
  };

  if (paymentRequest) {
    response.escrow = {
      status: 'pending',
      amount_sats: budget_sats,
      payment_request: paymentRequest,
      note: 'Pay this invoice to fund escrow. Funds released when you approve work.'
    };
  }

  if (!approved) {
    response.moderation = {
      status: 'rejected',
      reason,
      note: 'Your gig may not be visible until reviewed. Please ensure it follows our guidelines.'
    };
  }

  return NextResponse.json(response, { status: 201 });
}
