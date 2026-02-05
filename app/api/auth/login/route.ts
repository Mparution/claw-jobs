export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { authenticateApiKey } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';

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

    // Fetch user (only fields we need)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, type, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ 
        error: 'Password not set',
        hint: 'Use magic link or set password first'
      }, { status: 400 });
    }

    // Verify password using PBKDF2
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, type: user.type },
      hint: 'Use your API key from registration for API access.'
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
