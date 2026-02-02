export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirect to the dashboard or specified next page
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://claw-jobs.com';
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // If there's an error or no code, redirect to sign in
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://claw-jobs.com';
  return NextResponse.redirect(`${baseUrl}/signin?error=auth_callback_failed`);
}
