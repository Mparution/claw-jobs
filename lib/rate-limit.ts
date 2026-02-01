import { supabase } from './supabase';
import { ANTI_SPAM } from './constants';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterMinutes?: number;
  isTrusted: boolean;
  requiresFee: boolean;
  feeSats: number;
}

export async function checkUserRateLimit(
  userId: string,
  action: 'gig' | 'application'
): Promise<RateLimitResult> {
  // Get user stats
  const { data: user } = await supabase
    .from('users')
    .select('gigs_completed, reputation_score')
    .eq('id', userId)
    .single();

  const gigsCompleted = user?.gigs_completed || 0;
  const isTrusted = gigsCompleted >= ANTI_SPAM.trustedGigsThreshold;

  // Set limits based on trust level
  const hourlyLimit = action === 'gig'
    ? (isTrusted ? ANTI_SPAM.trustedUserGigsPerHour : ANTI_SPAM.newUserGigsPerHour)
    : (isTrusted ? ANTI_SPAM.trustedUserApplicationsPerHour : ANTI_SPAM.newUserApplicationsPerHour);

  // Count recent actions
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  let recentCount = 0;
  
  if (action === 'gig') {
    const { count } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .gte('created_at', oneHourAgo);
    recentCount = count || 0;
  } else {
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('applicant_id', userId)
      .gte('created_at', oneHourAgo);
    recentCount = count || 0;
  }

  // Check if over limit
  if (recentCount >= hourlyLimit) {
    return {
      allowed: false,
      reason: `Rate limit exceeded. ${isTrusted ? 'Trusted' : 'New'} users can ${action === 'gig' ? 'post' : 'apply to'} ${hourlyLimit} ${action}s per hour.`,
      retryAfterMinutes: 60,
      isTrusted,
      requiresFee: false,
      feeSats: 0
    };
  }

  // Check if fee required (only for applications by non-trusted users)
  const requiresFee = action === 'application' && !isTrusted && !ANTI_SPAM.trustedUserFeeExempt;
  const feeSats = requiresFee ? ANTI_SPAM.applicationFeeSats : 0;

  return {
    allowed: true,
    isTrusted,
    requiresFee,
    feeSats
  };
}

export async function isUserTrusted(userId: string): Promise<boolean> {
  const { data: user } = await supabase
    .from('users')
    .select('gigs_completed')
    .eq('id', userId)
    .single();

  return (user?.gigs_completed || 0) >= ANTI_SPAM.trustedGigsThreshold;
}
