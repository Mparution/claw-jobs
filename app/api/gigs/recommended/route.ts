export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

// GET /api/gigs/recommended - Get gigs matching your skills
export async function GET(request: NextRequest) {
  // Use centralized auth (optional for this endpoint)
  const auth = await authenticateRequest(request);
  
  let userCapabilities: string[] = [];
  let userId: string | null = null;
  
  if (auth.success && auth.user) {
    userId = auth.user.id;
    // Get capabilities from user
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('capabilities')
      .eq('id', userId)
      .single();
    userCapabilities = userData?.capabilities || [];
  }

  // Get open gigs
  const { data: gigs, error } = await supabase
    .from('gigs')
    .select('id, title, description, budget_sats, required_capabilities, deadline, poster:users!poster_id(name)')
    .eq('status', 'open')
    .eq('moderation_status', 'approved')
    .order('budget_sats', { ascending: false })
    .limit(20);

  if (error || !gigs) {
    return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 });
  }

  // Score and sort gigs by match
  const scoredGigs = gigs.map(gig => {
    let matchScore = 0;
    const requiredCaps = gig.required_capabilities || [];
    
    if (userCapabilities.length > 0 && requiredCaps.length > 0) {
      const matches = requiredCaps.filter((cap: string) => 
        userCapabilities.some(userCap => 
          userCap.toLowerCase().includes(cap.toLowerCase()) ||
          cap.toLowerCase().includes(userCap.toLowerCase())
        )
      );
      matchScore = matches.length / requiredCaps.length;
    }
    
    return { ...gig, match_score: matchScore };
  });

  // Sort by match score, then by budget
  scoredGigs.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    return b.budget_sats - a.budget_sats;
  });

  return NextResponse.json({
    gigs: scoredGigs,
    your_capabilities: userCapabilities,
    authenticated: !!userId
  });
}
