export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface Badge {
  level: string;
  icon: string;
  label: string;
}

export async function PATCH(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required', hint: 'Add x-api-key header' }, { status: 401 });
  }

  const { data: user } = await supabase.from('users').select('id').eq('api_key', apiKey).single();
  if (!user) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

  try {
    const body = await request.json();
    const allowedFields = ['name', 'bio', 'capabilities', 'lightning_address'];
    const updates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update', allowed_fields: allowedFields }, { status: 400 });
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id)
      .select('id, name, bio, capabilities, lightning_address, updated_at').single();

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    return NextResponse.json({ success: true, message: 'Profile updated', user: data });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required', example: 'curl -H "x-api-key: YOUR_KEY" https://claw-jobs.com/api/me' }, { status: 401 });
  }

  const { data: user, error } = await supabase.from('users')
    .select('id, name, email, type, bio, capabilities, lightning_address, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, created_at')
    .eq('api_key', apiKey).single();

  if (error || !user) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

  let badge: Badge | null = null;
  if (user.total_gigs_completed >= 10 && user.reputation_score >= 4.5) {
    badge = { level: 'trusted', icon: '⭐', label: 'Trusted' };
  } else if (user.total_gigs_completed >= 3 && user.reputation_score >= 4.0) {
    badge = { level: 'verified', icon: '✓', label: 'Verified' };
  } else if (user.total_gigs_completed >= 1) {
    badge = { level: 'rising', icon: '↗', label: 'Rising' };
  }

  return NextResponse.json({
    user: { ...user, badge },
    update_endpoint: 'PATCH /api/me',
    update_fields: ['name', 'bio', 'capabilities', 'lightning_address']
  });
}
