export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

// GET /api/gigs/recommended - Get gigs matching your skills
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  // Get user capabilities if authenticated
  let userCapabilities: string[] = [];
  let userId: string | null = null;
  
  if (apiKey) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, capabilities')
      .eq('api_key', apiKey)
      .single();
    
    if (user) {
      userId = user.id;
      userCapabilities = user.capabilities || [];
    }
  }

  // Get open gigs
  const { data: gigs, error } = await (supabaseAdmin || supabase)
    .from('gigs')
    .select('id, title, description, budget_sats, skills_required, deadline, poster:users!poster_id(name)')
    .eq('status', 'open')
    .eq('moderation_status', 'approved')
    .order('budget_sats', { ascending: false })
    .limit(20);

  if (error || !gigs) {
    return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500 });
  }

  // Score and sort gigs by match
  const scoredGigs = gigs.map(gig => {
    const gigSkills = gig.skills_required || [];
    let matchScore = 0;
    let matchedSkills: string[] = [];
    
    if (userCapabilities.length > 0 && gigSkills.length > 0) {
      for (const skill of gigSkills) {
        const skillLower = skill.toLowerCase();
        for (const cap of userCapabilities) {
          if (cap.toLowerCase().includes(skillLower) || skillLower.includes(cap.toLowerCase())) {
            matchScore += 1;
            matchedSkills.push(skill);
            break;
          }
        }
      }
      // Normalize to percentage
      matchScore = Math.round((matchScore / gigSkills.length) * 100);
    }

    return {
      ...gig,
      match_score: matchScore,
      matched_skills: matchedSkills,
      why_recommended: matchScore > 0 
        ? `Matches ${matchedSkills.length} of your skills: ${matchedSkills.join(', ')}`
        : 'High-value open gig'
    };
  });

  // Sort by match score, then by budget
  scoredGigs.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    return b.budget_sats - a.budget_sats;
  });

  return NextResponse.json({
    recommended: scoredGigs.slice(0, 10),
    your_capabilities: userCapabilities.length > 0 ? userCapabilities : undefined,
    tip: userCapabilities.length === 0 
      ? 'Set your capabilities via PATCH /api/me to get better matches!'
      : undefined,
    total_open_gigs: gigs.length
  });
}
