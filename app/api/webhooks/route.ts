export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
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
    .select('id, url, events, active, created_at')
    .eq('user_id', auth.user.id);

  if (webhooksError) {
    return NextResponse.json({ error: webhooksError.message }, { status: 500 });
  }

  return NextResponse.json(webhooks ?? []);
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
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // Generate webhook secret
  const secret = crypto.randomUUID().replace(/-/g, '');

  const { data: webhook, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .insert({
      user_id: auth.user.id,
      url,
      events,
      secret,
      active: true
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const typedWebhook = webhook as WebhookSubscription;

  return NextResponse.json({
    id: typedWebhook.id,
    url: typedWebhook.url,
    events: typedWebhook.events,
    secret: typedWebhook.secret,
    message: 'Save your secret! It won\'t be shown again.'
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
