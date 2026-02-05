export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint
    }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, type, bio, capabilities, lightning_address, reputation_score, total_earned_sats, total_gigs_completed, gigs_completed, referral_code, created_at')
    .eq('id', auth.user.id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint
    }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

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

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', auth.user.id)
    .select('id, name, email, type, bio, capabilities, lightning_address, reputation_score')
    .single();

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true,
    message: 'Profile updated',
    user 
  });
}
