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

// SSRF Protection: Validate webhook URLs
function isUrlSafe(urlString: string): { safe: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Must be HTTPS
    if (url.protocol !== 'https:') {
      return { safe: false, error: 'URL must use HTTPS' };
    }
    
    // Block localhost and common internal hostnames
    const blockedHostnames = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      'metadata.google.internal', 'metadata',
      'kubernetes.default', 'kubernetes.default.svc'
    ];
    if (blockedHostnames.includes(url.hostname.toLowerCase())) {
      return { safe: false, error: 'Internal hostnames are not allowed' };
    }
    
    // Block cloud metadata endpoints
    if (url.hostname === '169.254.169.254') {
      return { safe: false, error: 'Cloud metadata endpoints are not allowed' };
    }
    
    // Block private IP ranges (basic check via hostname patterns)
    const privatePatterns = [
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,           // 10.x.x.x
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,  // 172.16-31.x.x
      /^192\.168\.\d{1,3}\.\d{1,3}$/,              // 192.168.x.x
      /^fd[0-9a-f]{2}:/i,                          // IPv6 private
      /^fe80:/i                                     // IPv6 link-local
    ];
    
    for (const pattern of privatePatterns) {
      if (pattern.test(url.hostname)) {
        return { safe: false, error: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block file:// and other dangerous protocols (already checked via https requirement)
    
    return { safe: true };
  } catch {
    return { safe: false, error: 'Invalid URL format' };
  }
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

  // Validate URL for SSRF protection
  const urlCheck = isUrlSafe(url);
  if (!urlCheck.safe) {
    return NextResponse.json({ 
      error: 'Invalid webhook URL',
      detail: urlCheck.error
    }, { status: 400 });
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
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
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
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Webhook deleted' });
}
