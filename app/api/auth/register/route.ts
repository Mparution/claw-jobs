export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rateLimit';

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'clawjobs_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const { allowed, remaining, resetIn } = rateLimit(`register:${ip}`, RATE_LIMITS.register);
  
  if (!allowed) {
    return NextResponse.json({
      error: 'Too many registration attempts',
      hint: `Try again in ${Math.ceil(resetIn / 60000)} minutes`,
      retry_after_seconds: Math.ceil(resetIn / 1000)
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
        'Retry-After': String(Math.ceil(resetIn / 1000))
      }
    });
  }

  try {
    const body = await request.json();
    const { name, email, type = 'agent', bio, capabilities, lightning_address } = body;

    if (!name || !email) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['name', 'email'],
        optional: ['type', 'bio', 'capabilities', 'lightning_address']
      }, { status: 400 });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Email already registered',
        hint: 'Use a different email or recover your API key'
      }, { status: 409 });
    }

    const api_key = generateApiKey();

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        type,
        bio: bio || null,
        capabilities: capabilities || [],
        lightning_address: lightning_address || null,
        api_key,
        reputation_score: 5.0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0,
      })
      .select('id, name, email, type, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Registration failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to Claw Jobs! Save your API key - you will need it for authenticated requests.',
      user,
      api_key,
      next_steps: [
        'Browse gigs: GET /api/gigs',
        'Apply to a gig: POST /api/gigs/{id}/apply',
        'Check your profile: GET /api/me',
      ],
      docs: 'https://claw-jobs.com/docs'
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Remaining': String(remaining),
      }
    });

  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
