export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSecureApiKey } from '@/lib/crypto-utils';
import { authenticateRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';
import { checkContentModeration } from '@/lib/moderation';

const DEPOSIT_AMOUNT_SATS = 500;
const REFUND_DELAY_DAYS = 7;

export async function POST(request: NextRequest) {
  // SECURITY FIX: Add rate limiting
  const ip = getClientIP(request);
  const { allowed, resetIn } = rateLimit(`agent-register:${ip}`, RATE_LIMITS.register);
  
  if (!allowed) {
    return NextResponse.json({
      error: 'Too many registration attempts',
      retry_after_seconds: Math.ceil(resetIn / 1000)
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, lightning_address, capabilities, bio } = body;

    if (!name || !lightning_address) {
      return NextResponse.json(
        { error: 'Name and lightning_address are required' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Sanitize inputs
    const sanitizedName = sanitizeInput(name, 50);
    const sanitizedBio = bio ? sanitizeInput(bio, 500) : null;

    // SECURITY FIX: Check for inappropriate content in name/bio
    const moderationResult = await checkContentModeration(
      `${sanitizedName} ${sanitizedBio || ''}`
    );
    if (!moderationResult.approved) {
      return NextResponse.json({
        error: 'Content violates terms of service',
        reason: moderationResult.reason
      }, { status: 400 });
    }

    // SECURITY FIX: Check for duplicate name (not just lightning_address)
    const { data: existingByName } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('name', sanitizedName)
      .single();

    if (existingByName) {
      return NextResponse.json(
        { error: 'An account with this name already exists. Please choose a different name.' },
        { status: 409 }
      );
    }

    const { data: existingByAddress } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('lightning_address', lightning_address)
      .single();

    if (existingByAddress) {
      return NextResponse.json(
        { error: 'An account with this Lightning address already exists' },
        { status: 409 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate lightning address format
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(lightning_address)) {
      return NextResponse.json(
        { error: 'Invalid Lightning address format' },
        { status: 400 }
      );
    }

    // Use secure API key generation
    const apiKey = generateSecureApiKey('agent_');

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        name: sanitizedName,
        email: email ? email.toLowerCase() : null,
        lightning_address,
        type: 'agent',
        capabilities: capabilities || [],
        bio: sanitizedBio,
        api_key: apiKey,
        account_status: 'pending_deposit',
        deposit_amount_sats: DEPOSIT_AMOUNT_SATS,
        deposit_paid: false,
        reputation_score: 5.0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      api_key: apiKey,
      deposit: {
        amount_sats: DEPOSIT_AMOUNT_SATS,
        refund_after_days: REFUND_DELAY_DAYS,
        message: `Pay ${DEPOSIT_AMOUNT_SATS} sats to activate your account. Refunded after ${REFUND_DELAY_DAYS} days (minus ~10 sat network fee).`,
        payment_endpoint: `/api/agents/deposit-invoice?user_id=${user.id}`
      },
      next_steps: [
        '1. Get your deposit invoice from the payment_endpoint',
        '2. Pay the invoice to activate your account',
        '3. Use your API key to authenticate requests',
        '4. Start browsing and bidding on gigs',
        `5. After ${REFUND_DELAY_DAYS} days, deposit refunded to your Lightning address`
      ]
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Use centralized auth (supports hashed + legacy keys)
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'API key required' },
      { status: 401 }
    );
  }

  // Get additional user data
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, account_status, deposit_paid, deposit_paid_at, refund_eligible_at, deposit_amount_sats')
    .eq('id', auth.user.id)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user_id: user.id,
    name: user.name,
    account_status: user.account_status,
    deposit: {
      amount_sats: user.deposit_amount_sats,
      paid: user.deposit_paid,
      paid_at: user.deposit_paid_at,
      refund_eligible_at: user.refund_eligible_at
    }
  });
}
