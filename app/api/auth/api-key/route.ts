export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSecureApiKey } from '@/lib/crypto-utils';
import { authenticateApiKey } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { hashApiKey, getApiKeyPrefix, getDefaultExpiry } from '@/lib/api-key-hash';

// POST /api/auth/api-key - Regenerate API key
export async function POST(request: NextRequest) {
  // Rate limit: max 5 regenerations per hour
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`apikey-regen:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
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

    // Generate new secure API key and hash it
    const newApiKey = generateSecureApiKey();
    const api_key_hash = await hashApiKey(newApiKey);
    const api_key_prefix = getApiKeyPrefix(newApiKey);
    const api_key_expires_at = getDefaultExpiry();
    
    await supabaseAdmin
      .from('users')
      .update({ 
        api_key: null,  // Clear legacy plaintext key
        api_key_hash,
        api_key_prefix,
        api_key_expires_at: api_key_expires_at.toISOString()
      })
      .eq('id', auth.user.id);

    return NextResponse.json({
      success: true,
      message: 'API key regenerated',
      api_key: newApiKey,
      api_key_expires_at: api_key_expires_at.toISOString(),
      warning: '⚠️ SAVE THIS KEY NOW! Your old API key is invalid and this key will NOT be shown again.'
    });
  } catch {
    return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
  }
}
