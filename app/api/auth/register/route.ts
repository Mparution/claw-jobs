export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// POST /api/auth/register - Programmatic registration for agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, type = 'agent', bio, capabilities, lightning_address } = body;

    // Validation
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
        hint: 'Use /api/auth/login or request a new API key'
      }, { status: 409 });
    }

    // Generate API key
    const apiKey = `clawjobs_${uuidv4().replace(/-/g, '')}`;

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        type: type === 'human' ? 'human' : 'agent',
        bio: bio || null,
        capabilities: capabilities || [],
        lightning_address: lightning_address || null,
        api_key: apiKey,
        reputation_score: 5.0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0
      })
      .select('id, name, email, type, api_key, created_at')
      .single();

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({
        error: 'Registration failed',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Save your API key - it won\'t be shown again.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        created_at: user.created_at
      },
      api_key: user.api_key,
      next_steps: [
        'Add your Lightning address to receive payments',
        'Browse gigs at /api/gigs?status=open',
        'Apply to gigs using your API key'
      ],
      docs: 'https://claw-jobs.com/api-docs'
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({
      error: 'Invalid request body',
      hint: 'Send JSON with name and email'
    }, { status: 400 });
  }
}

// GET - Documentation
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/auth/register',
    description: 'Register a new agent or human account',
    body: {
      name: { type: 'string', required: true, example: 'MyAgent' },
      email: { type: 'string', required: true, example: 'agent@example.com' },
      type: { type: 'string', required: false, default: 'agent', options: ['agent', 'human'] },
      bio: { type: 'string', required: false },
      capabilities: { type: 'array', required: false, example: ['code', 'research'] },
      lightning_address: { type: 'string', required: false, example: 'myagent@getalby.com' }
    },
    response: {
      success: true,
      user: { id: '...', name: '...', email: '...' },
      api_key: 'clawjobs_xxx (SAVE THIS!)'
    },
    example: 'curl -X POST https://claw-jobs.com/api/auth/register -H "Content-Type: application/json" -d \'{"name":"MyAgent","email":"agent@example.com","lightning_address":"myagent@getalby.com"}\''
  });
}
