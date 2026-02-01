import { supabase } from './supabase';
import { RATE_LIMITS } from './constants';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  requiresPayment: boolean;
  feeSats: number;
  freeRemaining: number;
  paidRemaining: number;
  nextFreeAt?: string;
  canPayForMore: boolean;
}

interface ActionRecord {
  created_at: string;
  fee_paid: number | null;
}

export async function checkRateLimit(
  userId: string,
  action: 'gig' | 'application'
): Promise<RateLimitResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // Count actions in the last hour
  let totalCount = 0;
  let paidCount = 0;
  let lastActionTime: string | null = null;
  
  if (action === 'gig') {
    const { data, count } = await supabase
      .from('gigs')
      .select('created_at, fee_paid', { count: 'exact' })
      .eq('poster_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    const records = (data || []) as ActionRecord[];
    totalCount = count || 0;
    paidCount = records.filter((g: ActionRecord) => (g.fee_paid || 0) > 0).length;
    lastActionTime = records[0]?.created_at || null;
  } else {
    const { data, count } = await supabase
      .from('applications')
      .select('created_at, fee_paid', { count: 'exact' })
      .eq('applicant_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    const records = (data || []) as ActionRecord[];
    totalCount = count || 0;
    paidCount = records.filter((a: ActionRecord) => (a.fee_paid || 0) > 0).length;
    lastActionTime = records[0]?.created_at || null;
  }

  const maxPerHour = action === 'gig' ? RATE_LIMITS.maxGigsPerHour : RATE_LIMITS.maxApplicationsPerHour;
  const freePerHour = action === 'gig' ? RATE_LIMITS.freeGigsPerHour : RATE_LIMITS.freeApplicationsPerHour;
  
  // Check if at max limit
  if (totalCount >= maxPerHour) {
    return {
      allowed: false,
      reason: `Maximum ${maxPerHour} ${action}s per hour reached. Try again later.`,
      requiresPayment: false,
      feeSats: 0,
      freeRemaining: 0,
      paidRemaining: 0,
      canPayForMore: false
    };
  }

  // Check if free action available
  const freeUsed = totalCount - paidCount;
  const freeRemaining = Math.max(0, freePerHour - freeUsed);
  const paidRemaining = maxPerHour - totalCount;

  if (freeRemaining > 0) {
    // Free action available
    return {
      allowed: true,
      requiresPayment: false,
      feeSats: 0,
      freeRemaining: freeRemaining - 1,
      paidRemaining,
      canPayForMore: paidRemaining > 1
    };
  }

  // No free actions - need to pay
  // Check 10-minute cooldown for paid actions
  if (lastActionTime) {
    const lastAction = new Date(lastActionTime);
    const tenMinutesFromLast = new Date(lastAction.getTime() + RATE_LIMITS.minSecondsBetweenPaidActions * 1000);
    
    if (new Date() < tenMinutesFromLast) {
      const waitSeconds = Math.ceil((tenMinutesFromLast.getTime() - Date.now()) / 1000);
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return {
        allowed: false,
        reason: `Wait ${waitMinutes} minute(s) before your next paid ${action}. (10 min cooldown)`,
        requiresPayment: true,
        feeSats: RATE_LIMITS.extraActionFeeSats,
        freeRemaining: 0,
        paidRemaining,
        nextFreeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        canPayForMore: true
      };
    }
  }

  // Can pay for extra action
  return {
    allowed: true,
    requiresPayment: true,
    feeSats: RATE_LIMITS.extraActionFeeSats,
    freeRemaining: 0,
    paidRemaining: paidRemaining - 1,
    canPayForMore: paidRemaining > 1
  };
}
