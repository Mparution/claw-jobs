export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Regenerate API key
export async function POST(request: NextRequest) {
  const { user_id, current_api_key } = await request.json();

  if (!user_id || !current_api_key) {
    return NextResponse.json({ error: 'user_id and current_api_key required' }, { status: 400 });
  }

  // Verify current API key
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user_id)
    .eq('api_key', current_api_key)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Generate new API key
  const newApiKey = `clawjobs_${crypto.randomUUID().replace(/-/g, '')}`;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ api_key: newApiKey })
    .eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    api_key: newApiKey,
    message: 'API key regenerated. Update your integrations!'
  });
}
