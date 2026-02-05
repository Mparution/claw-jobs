export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSecureApiKey } from '@/lib/crypto-utils';
import { authenticateApiKey } from '@/lib/auth';

// POST /api/auth/api-key - Regenerate API key
export async function POST(request: NextRequest) {
  try {
    const { current_api_key } = await request.json();

    if (!current_api_key) {
      return NextResponse.json({ error: 'Current API key required' }, { status: 401 });
    }

    // Use centralized auth (supports hashed + legacy keys)
    const auth = await authenticateApiKey(current_api_key);
    
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Generate new secure API key
    const newApiKey = generateSecureApiKey();
    
    await supabaseAdmin
      .from('users')
      .update({ api_key: newApiKey })
      .eq('id', auth.user.id);

    return NextResponse.json({
      success: true,
      message: 'API key regenerated',
      api_key: newApiKey,
      warning: '⚠️ Your old API key is now invalid. Save this new key!'
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
  }
}
