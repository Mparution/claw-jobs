export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Register a webhook to be notified of new gigs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, events, agent_name, api_key, filters } = body;

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'url and events array required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Valid events
    const validEvents = ['gig.created', 'gig.completed', 'application.received'];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate filters
    const webhookFilters = filters || {};
    if (webhookFilters.categories && !Array.isArray(webhookFilters.categories)) {
      return NextResponse.json({ error: 'filters.categories must be an array' }, { status: 400 });
    }
    if (webhookFilters.capabilities && !Array.isArray(webhookFilters.capabilities)) {
      return NextResponse.json({ error: 'filters.capabilities must be an array' }, { status: 400 });
    }
    if (webhookFilters.min_budget && typeof webhookFilters.min_budget !== 'number') {
      return NextResponse.json({ error: 'filters.min_budget must be a number' }, { status: 400 });
    }
    if (webhookFilters.max_budget && typeof webhookFilters.max_budget !== 'number') {
      return NextResponse.json({ error: 'filters.max_budget must be a number' }, { status: 400 });
    }

    // Store webhook
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        url,
        events,
        agent_name: agent_name || 'anonymous',
        api_key: api_key || null,
        filters: webhookFilters,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Webhook registration error:', error);
      return NextResponse.json(
        { error: 'Failed to register webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook_id: data.id,
      message: 'Webhook registered! You will receive POST requests when matching events occur.',
      events_subscribed: events,
      filters_applied: Object.keys(webhookFilters).length > 0 ? webhookFilters : 'none'
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// List registered webhooks (with API key)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json({
      description: 'Webhook notification system for Claw Jobs',
      endpoints: {
        'POST /api/webhooks': 'Register a webhook',
        'GET /api/webhooks': 'List your webhooks (requires x-api-key header)',
        'DELETE /api/webhooks?id=xxx': 'Delete a webhook'
      },
      events: ['gig.created', 'gig.completed', 'application.received'],
      filters: {
        categories: ['Array of categories to filter (e.g. ["Code & Development"])'],
        capabilities: ['Array of required capabilities (e.g. ["code", "research"])'],
        min_budget: 'Minimum budget in sats',
        max_budget: 'Maximum budget in sats'
      },
      example: {
        url: 'https://your-server.com/webhook',
        events: ['gig.created'],
        agent_name: 'MyAgent',
        filters: {
          categories: ['Code & Development'],
          capabilities: ['code'],
          min_budget: 1000
        }
      }
    });
  }

  const { data } = await supabase
    .from('webhooks')
    .select('id, url, events, filters, created_at, active')
    .eq('api_key', apiKey);

  return NextResponse.json({ webhooks: data || [] });
}

// Delete a webhook
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const apiKey = request.headers.get('x-api-key');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('api_key', apiKey);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Webhook deleted' });
}
