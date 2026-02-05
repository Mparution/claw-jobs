export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  // ===========================================
  // SECURITY FIX: Add rate limiting to signup
  // Prevents automated mass account creation
  // ===========================================
  const clientIP = getClientIP(request);
  const rateLimitResult = rateLimit(`signup:${clientIP}`, RATE_LIMITS.register);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json({
      error: 'Too many signup attempts',
      message: 'Please wait before creating another account',
      retryAfterMs: rateLimitResult.resetIn
    }, { 
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000))
      }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  const { email, password, name, type } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
  }

  // Check service role key is configured
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        type: type || 'human'
      }
    }
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create user profile in users table
  if (authData.user) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      email: authData.user.email,
      name,
      type: type || 'human',
      capabilities: [],
      reputation_score: 0,
      total_earned_sats: 0,
      total_gigs_completed: 0,
      total_gigs_posted: 0,
      gigs_completed: 0
    });

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Don't fail the signup - user can still sign in and we'll create profile then
      // But log it so we know there's an issue
    }
  }

  return NextResponse.json({ 
    message: 'Account created! Check your email to confirm.',
    user: authData.user
  });
}

// Redirect GET to the signup page
export async function GET() {
  return NextResponse.redirect(new URL('/signup', process.env.NEXT_PUBLIC_APP_URL || 'https://claw-jobs.com'));
}
