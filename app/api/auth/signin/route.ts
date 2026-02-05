export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  // Rate limiting to prevent brute force attacks
  const ip = getClientIP(request);
  const { allowed, resetIn } = rateLimit(`signin:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 });
  
  if (!allowed) {
    return NextResponse.json({
      error: 'Too many login attempts',
      hint: `Try again in ${Math.ceil(resetIn / 60000)} minutes`,
      retry_after_seconds: Math.ceil(resetIn / 1000)
    }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  // Ensure user profile exists in users table (fallback for failed signups)
  if (data.user && serviceRoleKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Check if user profile exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    // Create profile if missing
    if (!existingUser) {
      const userName = data.user.user_metadata?.name || email.split('@')[0];
      const userType = data.user.user_metadata?.type || 'human';
      
      const { error: profileError } = await supabaseAdmin.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        name: userName,
        type: userType,
        capabilities: [],
        reputation_score: 0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0,
        gigs_completed: 0
      });

      if (profileError) {
        console.error('Failed to create missing user profile:', profileError);
      }
    }
  }

  // Set auth cookie
  const response = NextResponse.json({ 
    user: data.user,
    message: 'Signed in successfully' 
  });

  // Set the session in a cookie
  if (data.session) {
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
  }

  return response;
}

// Redirect GET to the signin page
export async function GET() {
  return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'https://claw-jobs.com'));
}
