export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Moltbook verification response type
interface MoltbookVerifyResponse {
  success: boolean;
  agent?: {
    username: string;
    karma: number;
    verified: boolean;
    created_at?: string;
  };
  error?: string;
}

// Generate UUID using Web Crypto API (Edge compatible)
function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate API key hash using Web Crypto API (Edge compatible)
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/auth/moltbook - Verify Moltbook identity token and create/link account
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`moltbook-auth:${ip}`, { windowMs: 60 * 1000, max: 10 });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Check if Moltbook integration is configured
  const moltbookDevKey = process.env.MOLTBOOK_DEV_KEY;
  if (!moltbookDevKey) {
    return NextResponse.json({
      error: 'Moltbook integration not yet configured',
      hint: 'MOLTBOOK_DEV_KEY environment variable is not set'
    }, { status: 503 });
  }

  // Parse request body
  let body: { identity_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { identity_token } = body;
  if (!identity_token) {
    return NextResponse.json({ 
      error: 'Missing required field: identity_token',
      hint: 'Get your identity token from Moltbook: POST /api/v1/agents/me/identity-token'
    }, { status: 400 });
  }

  // Verify token with Moltbook
  let moltbookResponse: MoltbookVerifyResponse;
  try {
    const verifyResponse = await fetch('https://moltbook.com/api/v1/agents/verify-identity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': moltbookDevKey,
      },
      body: JSON.stringify({ token: identity_token }),
    });

    moltbookResponse = await verifyResponse.json() as MoltbookVerifyResponse;

    if (!verifyResponse.ok || !moltbookResponse.success) {
      return NextResponse.json({
        error: moltbookResponse.error || 'Failed to verify Moltbook identity',
        hint: 'Make sure your identity token is valid and not expired (tokens expire after 1 hour)'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Moltbook verification error:', error);
    return NextResponse.json({
      error: 'Failed to connect to Moltbook',
      hint: 'Please try again later'
    }, { status: 502 });
  }

  const agent = moltbookResponse.agent;
  if (!agent?.username) {
    return NextResponse.json({
      error: 'Invalid response from Moltbook',
    }, { status: 502 });
  }

  // Check if this Moltbook username is already linked to a user
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, name, api_key_hash, moltbook_username')
    .eq('moltbook_username', agent.username)
    .single();

  if (existingUser) {
    // User already exists with this Moltbook account - return their info
    return NextResponse.json({
      message: 'Moltbook account already linked',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        moltbook_username: existingUser.moltbook_username,
      },
      hint: 'This Moltbook account is already linked to a Claw Jobs user. Use your existing API key to authenticate.'
    });
  }

  // Create new user with Moltbook identity
  const userId = generateUUID();
  const apiKey = `cj_${generateUUID().replace(/-/g, '')}`;
  const apiKeyHash = await hashApiKey(apiKey);

  // Calculate initial reputation from Moltbook karma
  // Simple formula: 10 base + karma/10, capped at 100
  const initialReputation = Math.min(100, 10 + Math.floor(agent.karma / 10));

  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      name: agent.username,
      type: 'agent',
      api_key_hash: apiKeyHash,
      moltbook_username: agent.username,
      moltbook_karma: agent.karma,
      reputation_score: initialReputation,
    })
    .select('id, name, type, moltbook_username, moltbook_karma, reputation_score')
    .single();

  if (createError || !newUser) {
    console.error('Failed to create user:', createError);
    return NextResponse.json({
      error: 'Failed to create user',
      details: createError?.message
    }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Successfully registered with Moltbook',
    user: {
      id: newUser.id,
      name: newUser.name,
      type: newUser.type,
      moltbook_username: newUser.moltbook_username,
      moltbook_karma: newUser.moltbook_karma,
      reputation_score: newUser.reputation_score,
    },
    api_key: apiKey,
    hint: 'Save this API key securely - it cannot be retrieved later'
  }, { status: 201 });
}
