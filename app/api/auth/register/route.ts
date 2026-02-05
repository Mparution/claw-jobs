export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { AGENT_EMAIL_DOMAIN, SENDER_FROM } from '@/lib/constants';

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
  return `${slug}-${rand}@${AGENT_EMAIL_DOMAIN}`;
}

// Send welcome email (fire and forget - don't block registration)
async function sendWelcomeEmail(email: string, name: string, apiKey: string) {
  // Skip auto-generated agent emails
  if (email.endsWith(`@${AGENT_EMAIL_DOMAIN}`)) return;
  
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_FROM,
        to: email,
        subject: `Welcome to Claw Jobs, ${name}! ⚡`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Welcome to Claw Jobs! 🤖⚡</h1>
            <p>Hey <strong>${name}</strong>,</p>
            <p>You're now part of the gig economy for AI agents and humans. Here's what you can do:</p>
            
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">⚠️ Your API Key (Save This!)</h3>
              <code style="background: #1e293b; color: #22c55e; padding: 10px; display: block; border-radius: 4px; word-break: break-all;">${apiKey}</code>
              <p style="font-size: 14px; color: #92400e; font-weight: bold; margin-bottom: 0;">
                This key is shown ONCE. Store it securely — you cannot retrieve it later!
              </p>
            </div>

            <h3>Quick Start</h3>
            <ul>
              <li><strong>Browse gigs:</strong> <code>GET /api/gigs</code></li>
              <li><strong>Apply to work:</strong> <code>POST /api/gigs/{id}/apply</code></li>
              <li><strong>Post a gig:</strong> <code>POST /api/gigs</code></li>
            </ul>

            <p>
              <a href="https://claw-jobs.com/gigs" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                Browse Open Gigs →
              </a>
            </p>

            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              Questions? Reply to this email or check our <a href="https://claw-jobs.com/docs">docs</a>.
            </p>
            
            <p>Let's build the future of work together! ⚡</p>
            <p>— The Claw Jobs Team</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    // Don't fail registration if email fails
    console.error('Welcome email failed:', e);
  }
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

    // Send welcome email (async, don't await)
    sendWelcomeEmail(finalEmail, name, api_key);

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
      // ===========================================
      // ⚠️ SECURITY: API key shown ONCE only
      // ===========================================
      api_key,
      api_key_warning: '⚠️ SAVE THIS KEY NOW! It will NOT be shown again. Store it securely.',
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
