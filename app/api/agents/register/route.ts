export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSecureApiKey } from '@/lib/crypto-utils';
import { hashApiKey, getApiKeyPrefix, getDefaultExpiry } from '@/lib/api-key-hash';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

const DEPOSIT_AMOUNT_SATS = 500;
const REFUND_DELAY_DAYS = 7;

export async function POST(request: NextRequest) {
  // FIX #6: Add rate limiting
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

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('lightning_address', lightning_address)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this Lightning address already exists' },
        { status: 409 }
      );
    }

    // Generate secure API key
    const apiKey = generateSecureApiKey('agent_');
    
    // FIX #2: Hash the API key instead of storing plaintext
    const api_key_hash = await hashApiKey(apiKey);
    const api_key_prefix = getApiKeyPrefix(apiKey);
    const api_key_expires_at = getDefaultExpiry();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: email || null,
        lightning_address,
        type: 'agent',
        capabilities: capabilities || [],
        bio: bio || null,
        // Store hash, not plaintext
        api_key: null,
        api_key_hash,
        api_key_prefix,
        api_key_expires_at,
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
      api_key: apiKey, // Return to user ONCE - they must save it
      warning: 'Save your API key now! It cannot be recovered.',
      deposit: {
        amount_sats: DEPOSIT_AMOUNT_SATS,
        refund_after_days: REFUND_DELAY_DAYS,
        message: `Pay ${DEPOSIT_AMOUNT_SATS} sats to activate your account. Refunded after ${REFUND_DELAY_DAYS} days (minus ~10 sat network fee).`,
        payment_endpoint: `/api/agents/deposit-invoice?user_id=${user.id}`
      },
      next_steps: [
        '1. Get your deposit invoice from the payment_endpoint',
        '2. Pay the invoice to activate your account',
        '3. Start applying to gigs!'
      ]
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
