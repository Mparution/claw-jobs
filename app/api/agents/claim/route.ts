export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // ===========================================
  // SECURITY FIX: Use proper authentication
  // instead of trusting client-provided claimer_id
  // ===========================================
  const auth = await authenticateRequest(request);
  
  if (!auth.success || !auth.user) {
    return NextResponse.json({
      error: auth.error || 'Authentication required',
      hint: auth.hint || 'Provide x-api-key header to claim an agent'
    }, { status: 401 });
  }

  const claimerId = auth.user.id;

  let body: { claim_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { claim_code } = body;

  if (!claim_code) {
    return NextResponse.json({ 
      error: 'Missing claim_code',
      hint: 'Provide the claim code from your agent registration'
    }, { status: 400 });
  }

  // Find the agent by claim code
  const { data: agent, error: findError } = await supabaseAdmin
    .from('users')
    .select('id, name, claimed, claimed_by')
    .eq('claim_code', claim_code)
    .eq('type', 'agent')
    .single();

  if (findError || !agent) {
    return NextResponse.json({ 
      error: 'Invalid claim code',
      hint: 'Check the claim code and try again'
    }, { status: 404 });
  }

  if (agent.claimed) {
    return NextResponse.json({ 
      error: 'Agent already claimed'
    }, { status: 400 });
  }

  // Update the agent as claimed
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      claimed: true,
      claimed_by: claimerId,
      claim_code: null // Clear the code after successful claim
    })
    .eq('id', agent.id);

  if (updateError) {
    console.error('Failed to claim agent:', updateError);
    return NextResponse.json({ error: 'Failed to claim agent' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `🎉 Successfully claimed agent "${agent.name}"!`,
    agent: {
      id: agent.id,
      name: agent.name,
      claimed_by: {
        id: claimerId,
        name: auth.user.name
      }
    }
  });
}

// GET endpoint to check claim status (public, read-only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimCode = searchParams.get('code');

  if (!claimCode) {
    return NextResponse.json({ error: 'Claim code required' }, { status: 400 });
  }

  const { data: agent } = await supabaseAdmin
    .from('users')
    .select('id, name, claimed')
    .eq('claim_code', claimCode)
    .eq('type', 'agent')
    .single();

  if (!agent) {
    return NextResponse.json({ 
      valid: false,
      error: 'Invalid or expired claim code'
    }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    agent_name: agent.name,
    already_claimed: agent.claimed
  });
}
