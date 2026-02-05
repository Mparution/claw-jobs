export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';
import { authenticateApiKey } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`setpw:${ip}`, RATE_LIMITS.register);
  if (!allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  try {
    const { api_key, password } = await request.json();

    if (!api_key) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Use centralized auth (supports hashed + legacy keys)
    const auth = await authenticateApiKey(api_key);
    
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Hash password with PBKDF2 (100k iterations)
    const passwordHash = await hashPassword(password);
    
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', auth.user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      hint: 'Login with POST /api/auth/login { email, password }'
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
