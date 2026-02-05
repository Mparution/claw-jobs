export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { authenticateApiKey } from '@/lib/auth';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (process.env.PASSWORD_SALT || 'claw-jobs-salt'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe password verification to prevent timing attacks
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  
  // Constant-time comparison
  if (passwordHash.length !== storedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    result |= passwordHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed, resetIn } = rateLimit(`login:${ip}`, RATE_LIMITS.register);
  
  if (!allowed) {
    return NextResponse.json({
      error: 'Too many login attempts',
      retry_after_seconds: Math.ceil(resetIn / 1000)
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, password, api_key } = body;

    // Login via API key (supports hashed + legacy)
    if (api_key) {
      const auth = await authenticateApiKey(api_key);
      
      if (!auth.success || !auth.user) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      // ===========================================
      // SECURITY FIX: Don't return API key on login
      // User already has it from registration
      // ===========================================
      return NextResponse.json({
        success: true,
        user: { id: auth.user.id, name: auth.user.name, email: auth.user.email, type: auth.user.type },
        message: 'Authenticated via API key'
      });
    }

    // Login via email/password
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password required (or use api_key)',
        example: { email: 'user@example.com', password: 'yourpassword' }
      }, { status: 400 });
    }

    // SECURITY: Only select fields we actually need (no api_key!)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, type, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      // Use same error message whether user exists or not (prevents enumeration)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ 
        error: 'Password not set',
        hint: 'Use magic link or set password first'
      }, { status: 400 });
    }

    // SECURITY: Use timing-safe comparison
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ===========================================
    // SECURITY FIX: Don't return API key
    // If user lost their key, they should regenerate via /api/auth/api-key
    // ===========================================
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, type: user.type },
      hint: 'Use your API key from registration for API access. Lost it? Use POST /api/auth/api-key to regenerate.'
    });

  } catch (error: unknown) {
    // Log error details server-side only
    console.error('Login error:', error);
    // Return generic error to client
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
