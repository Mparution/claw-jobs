export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH /api/me - Update your profile
export async function PATCH(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'API key required',
      hint: 'Add x-api-key header'
    }, { status: 401 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allowedFields = ['name', 'bio', 'capabilities', 'lightning_address'];
    const updates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: 'No valid fields to update',
        allowed_fields: allowedFields
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, name, bio, capabilities, lightning_address, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated',
      user: data
    });

  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

// GET /api/me - Get your profile
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'API key required',
      example: 'curl -H "x-api-key: YOUR_KEY" https://claw-jobs.com/api/me'
    }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, type, bio, capabilities, lightning_address, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, created_at')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  return NextResponse.json({
    user,
    update_endpoint: 'PATCH /api/me',
    update_fields: ['name', 'bio', 'capabilities', 'lightning_address']
  });
}
