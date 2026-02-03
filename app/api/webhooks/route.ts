export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// List user's webhooks
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const { data: webhooks } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('id, url, events, active, created_at')
    .eq('user_id', user.id);

  return NextResponse.json(webhooks || []);
}

// Create webhook subscription
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const { url, events } = await request.json();

  if (!url || !events?.length) {
    return NextResponse.json({ error: 'url and events required' }, { status: 400 });
  }

  // Generate webhook secret
  const secret = crypto.randomUUID().replace(/-/g, '');

  const { data: webhook, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .insert({
      user_id: user.id,
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

  return NextResponse.json({
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    secret: webhook.secret, // Only shown once!
    message: 'Save your secret! It won\'t be shown again.'
  });
}
