// ===========================================
// CLAW JOBS - MODERATION UTILITIES
// ===========================================

import {
  PROHIBITED_SERVICES,
  REVIEW_TRIGGER_KEYWORDS,
  ALLOWED_CATEGORIES,
  NEW_USER_SETTINGS,
  MODERATION_STATUS,
  type ModerationStatus
} from './constants';

export interface ModerationResult {
  status: ModerationStatus;
  autoApproved: boolean;
  flaggedKeywords: string[];
  prohibitedKeywords: string[];
  requiresReview: boolean;
  reason?: string;
}

export interface UserTrustLevel {
  isEstablished: boolean;
  requiresGigReview: boolean;
  escrowDelayHours: number;
}

/**
 * Check text content for prohibited keywords
 */
export function checkProhibitedContent(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of PROHIBITED_SERVICES) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.push(keyword);
    }
  }
  
  return found;
}

/**
 * Check text content for review-trigger keywords
 */
export function checkReviewTriggers(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of REVIEW_TRIGGER_KEYWORDS) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.push(keyword);
    }
  }
  
  return found;
}

/**
 * Validate category is in allowed list
 */
export function isValidCategory(category: string): boolean {
  return ALLOWED_CATEGORIES.includes(category as any);
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Full moderation check for a gig
 */
export function moderateGig(
  title: string,
  description: string,
  category: string,
  userGigsCompleted: number = 0,
  userReputation: number = 0
): ModerationResult {
  const fullText = `${title} ${description}`;
  
  // Check for prohibited content (auto-reject)
  const prohibitedKeywords = checkProhibitedContent(fullText);
  if (prohibitedKeywords.length > 0) {
    return {
      status: MODERATION_STATUS.REJECTED,
      autoApproved: false,
      flaggedKeywords: [],
      prohibitedKeywords,
      requiresReview: false,
      reason: `Prohibited content detected: ${prohibitedKeywords.join(', ')}`
    };
  }
  
  // Check category is valid
  if (!isValidCategory(category)) {
    return {
      status: MODERATION_STATUS.REJECTED,
      autoApproved: false,
      flaggedKeywords: [],
      prohibitedKeywords: [],
      requiresReview: false,
      reason: `Invalid category: ${category}`
    };
  }
  
  // Check for review triggers
  const flaggedKeywords = checkReviewTriggers(fullText);
  
  const isEstablished = 
    userGigsCompleted >= NEW_USER_SETTINGS.establishedGigsThreshold &&
    userReputation >= NEW_USER_SETTINGS.establishedReputationThreshold;
  
  const isNewUser = userGigsCompleted < NEW_USER_SETTINGS.gigsBeforeAutoApproval;
  
  if (flaggedKeywords.length > 0 || isNewUser) {
    return {
      status: MODERATION_STATUS.PENDING,
      autoApproved: false,
      flaggedKeywords,
      prohibitedKeywords: [],
      requiresReview: true,
      reason: isNewUser 
        ? 'New user - manual review required'
        : `Flagged keywords: ${flaggedKeywords.join(', ')}`
    };
  }
  
  return {
    status: MODERATION_STATUS.APPROVED,
    autoApproved: true,
    flaggedKeywords: [],
    prohibitedKeywords: [],
    requiresReview: false
  };
}

/**
 * Get user trust level and associated settings
 */
export function getUserTrustLevel(
  gigsCompleted: number,
  reputationScore: number
): UserTrustLevel {
  const isEstablished = 
    gigsCompleted >= NEW_USER_SETTINGS.establishedGigsThreshold &&
    reputationScore >= NEW_USER_SETTINGS.establishedReputationThreshold;
  
  return {
    isEstablished,
    requiresGigReview: gigsCompleted < NEW_USER_SETTINGS.gigsBeforeAutoApproval,
    escrowDelayHours: isEstablished 
      ? NEW_USER_SETTINGS.establishedEscrowDelayHours 
      : NEW_USER_SETTINGS.escrowDelayHours
  };
}

/**
 * Check if escrow can be released
 */
export function canReleaseEscrow(
  deliveryApprovedAt: Date,
  escrowDelayHours: number
): boolean {
  const now = new Date();
  const delayMs = escrowDelayHours * 60 * 60 * 1000;
  const releaseTime = new Date(deliveryApprovedAt.getTime() + delayMs);
  return now >= releaseTime;
}

/**
 * Sanitize user input - basic XSS prevention
 */
export function sanitizeInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
