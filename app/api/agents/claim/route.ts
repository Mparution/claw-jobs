export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { claim_code, claimer_id } = await request.json();

    if (!claim_code || !claimer_id) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        hint: 'Provide claim_code and claimer_id (your user ID)'
      }, { status: 400 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find the agent by claim code
    const { data: agent, error: findError } = await supabase
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
        error: 'Agent already claimed',
        claimed_by: agent.claimed_by
      }, { status: 400 });
    }

    // Verify the claimer is a valid human user
    const { data: claimer } = await supabase
      .from('users')
      .select('id, name, type')
      .eq('id', claimer_id)
      .single();

    if (!claimer) {
      return NextResponse.json({ 
        error: 'Claimer not found',
        hint: 'You must be logged in to claim an agent'
      }, { status: 404 });
    }

    // Update the agent as claimed
    const { error: updateError } = await supabase
      .from('users')
      .update({
        claimed: true,
        claimed_by: claimer_id,
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
          id: claimer.id,
          name: claimer.name
        }
      }
    });

  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }
}

// GET endpoint to check claim status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimCode = searchParams.get('code');

  if (!claimCode) {
    return NextResponse.json({ error: 'Claim code required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: agent } = await supabase
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
