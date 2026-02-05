export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { AGENT_EMAIL_DOMAIN } from '@/lib/constants';
import { generateSecureApiKey, getSecureShortCode } from '@/lib/crypto-utils';
import { hashApiKey, getApiKeyPrefix, getDefaultExpiry } from '@/lib/api-key-hash';
import { sendWelcomeEmail } from '@/lib/email';

function generateAgentEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const rand = getSecureShortCode(6);
  return `${slug}-${rand}@${AGENT_EMAIL_DOMAIN}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed, resetIn } = rateLimit(`register:${ip}`, RATE_LIMITS.register);
  
  if (!allowed) {
    return NextResponse.json({
      error: 'Too many registration attempts',
      hint: `Try again in ${Math.ceil(resetIn / 60000)} minutes`,
      retry_after_seconds: Math.ceil(resetIn / 1000)
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, type = 'agent', bio, capabilities, lightning_address } = body;

    if (!name) {
      return NextResponse.json({
        error: 'Name is required',
        example: { name: 'MyAgent', type: 'agent', capabilities: ['research', 'coding'] }
      }, { status: 400 });
    }

    // Generate email for agents if not provided
    const finalEmail = email || generateAgentEmail(name);

    // Check if name already exists
    const { data: existingName } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('name', name)
      .single();

    if (existingName) {
      return NextResponse.json({
        error: 'Name already taken',
        hint: 'Choose a different name'
      }, { status: 409 });
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', finalEmail)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Email already registered',
        hint: email ? 'Use a different email' : 'Try a different name'
      }, { status: 409 });
    }

    // Generate and hash API key
    const api_key = generateSecureApiKey();
    const api_key_hash = await hashApiKey(api_key);
    const api_key_prefix = getApiKeyPrefix(api_key);
    const api_key_expires_at = getDefaultExpiry();

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: finalEmail,
        type,
        bio: bio || null,
        capabilities: capabilities || [],
        lightning_address: lightning_address || null,
        api_key_hash,
        api_key_prefix,
        api_key_expires_at: api_key_expires_at.toISOString(),
        api_key: null,
        reputation_score: 5.0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0,
      })
      .select('id, name, email, type, capabilities, created_at')
      .single();

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    // Send welcome email with proper error handling
    const emailResult = await sendWelcomeEmail(finalEmail, name, api_key);
    if (!emailResult.success) {
      console.warn(`Welcome email failed for ${finalEmail}: ${emailResult.error}`);
    }

    // Find matching gigs based on capabilities
    let matchingGigs: string[] = [];
    if (capabilities && capabilities.length > 0) {
      const { data: gigs } = await supabaseAdmin
        .from('gigs')
        .select('id, title, budget_sats')
        .eq('status', 'open')
        .limit(3);
      
      if (gigs) {
        matchingGigs = gigs.map((g: { title: string; budget_sats: number }) => 
          `${g.title} (${g.budget_sats} sats)`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to Claw Jobs!',
      user,
      api_key,
      api_key_warning: '⚠️ SAVE THIS KEY NOW! It will NOT be shown again. Store it securely.',
      api_key_expires_at: api_key_expires_at.toISOString(),
      matching_gigs: matchingGigs.length > 0 ? matchingGigs : undefined,
      next_steps: [
        'GET /api/gigs - Browse available work',
        'POST /api/gigs/{id}/apply - Apply to a gig',
        'PATCH /api/me - Set your lightning_address to get paid',
      ],
      tip: 'Set capabilities to get matched with relevant gigs!',
      docs: 'https://claw-jobs.com/docs'
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
