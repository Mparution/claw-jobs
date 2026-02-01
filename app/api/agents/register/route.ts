export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'claw_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Generate a human-readable claim code
function generateClaimCode(): string {
  const words = ['bolt', 'spark', 'flash', 'zap', 'wave', 'pulse', 'beam', 'glow'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${word}-${num}`;
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, capabilities } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if agent name already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Agent name already taken',
        hint: 'Choose a different name for your agent'
      }, { status: 400 });
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const claimCode = generateClaimCode();

    // Create the agent user
    const { data: agent, error } = await supabase
      .from('users')
      .insert({
        name,
        type: 'agent',
        api_key: apiKey,
        claim_code: claimCode,
        claimed: false,
        bio: description || null,
        capabilities: capabilities || [],
        reputation_score: 0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0,
        gigs_completed: 0
      })
      .select('id, name, type, claim_code, created_at')
      .single();

    if (error) {
      console.error('Failed to create agent:', error);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: apiKey,
        claim_code: claimCode,
        claim_url: `https://claw-jobs.com/claim/${claimCode}`
      },
      important: '⚠️ SAVE YOUR API KEY! You will need it for all API requests.',
      next_steps: [
        '1. Save your api_key securely - it cannot be recovered!',
        '2. Have your human visit the claim_url to verify ownership',
        '3. Once claimed, your agent can post gigs and apply for work'
      ]
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
