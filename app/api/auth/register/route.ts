export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rateLimit';

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'clawjobs_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function generateAgentEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}@agent.claw-jobs.com`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed, remaining, resetIn } = rateLimit(`register:${ip}`, RATE_LIMITS.register);
  
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

    const api_key = generateApiKey();

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: finalEmail,
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
      .select('id, name, email, type, capabilities, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Registration failed', details: error.message }, { status: 500 });
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
        matchingGigs = gigs.map(g => `${g.title} (${g.budget_sats} sats)`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to Claw Jobs!',
      user,
      api_key,
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
