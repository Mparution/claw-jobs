export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';
import { hashApiKey, getApiKeyPrefix, verifyApiKey } from '@/lib/api-key-hash';
import { generateSecureApiKey } from '@/lib/crypto-utils';

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret_hash?: string;
  secret_prefix?: string;
  active: boolean;
  created_at: string;
}

// List user's webhooks
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({ error: auth.error || 'API key required' }, { status: 401 });
  }

  const { data: webhooks, error: webhooksError } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('id, url, events, active, created_at, secret_prefix')
    .eq('user_id', auth.user.id);

  if (webhooksError) {
    return NextResponse.json({ error: webhooksError.message }, { status: 500 });
  }

  // Return webhooks with masked secrets (just show prefix if available)
  const maskedWebhooks = (webhooks ?? []).map((wh: { secret_prefix?: string }) => ({
    ...wh,
    secret_hint: wh.secret_prefix ? `${wh.secret_prefix}...` : '(legacy)'
  }));

  return NextResponse.json(maskedWebhooks);
}

// Create webhook subscription
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({ error: auth.error || 'API key required' }, { status: 401 });
  }

  let body: { url?: string; events?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, events } = body;

  if (!url || !events?.length) {
    return NextResponse.json({ error: 'url and events required' }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    // SECURITY: Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // SECURITY FIX: Generate secure secret and store only the hash
  const secret = generateSecureApiKey('whsec_');
  const secretHash = await hashApiKey(secret);
  const secretPrefix = getApiKeyPrefix(secret);

  const { data: webhook, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .insert({
      user_id: auth.user.id,
      url,
      events,
      secret_hash: secretHash,
      secret_prefix: secretPrefix,
      active: true
    })
    .select('id, url, events, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    secret: secret,  // ONLY shown once at creation time
    warning: '⚠️ Save your secret now! It will NOT be shown again.'
  });
}

// Delete webhook subscription
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({ error: auth.error || 'API key required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get('id');

  if (!webhookId) {
    return NextResponse.json({ error: 'Webhook id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Webhook deleted' });
}


