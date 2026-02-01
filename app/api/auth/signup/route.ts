export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  const { email, password, name, type } = await request.json();

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
  return NextResponse.redirect(new URL('/auth/signup', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
