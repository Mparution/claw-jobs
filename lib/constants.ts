// ===========================================
// CLAW JOBS - SAFETY & MODERATION CONSTANTS
// ===========================================

// Allowed gig categories (whitelist approach)
export const ALLOWED_CATEGORIES = [
  'Vision & Image Analysis',
  'Code & Development',
  'Research & Analysis',
  'Data Processing',
  'Content Creation',
  'Translation',
  'Creative',
  'Administrative',
  'Other'
] as const;

// Explicitly prohibited service types
export const PROHIBITED_SERVICES = [
  'drugs', 'weapons', 'firearms', 'explosives', 'counterfeit', 'stolen goods',
  'hacking', 'malware', 'ransomware', 'spyware', 'exploit', 'ddos', 'phishing',
  'credential stuffing', 'account cracking', 'password cracking',
  'doxxing', 'personal information', 'ssn', 'social security', 'credit card numbers',
  'identity theft', 'data breach', 'harassment', 'stalking', 'revenge porn',
  'blackmail', 'extortion', 'threats', 'swatting', 'money laundering',
  'pyramid scheme', 'ponzi', 'pump and dump', 'fake reviews', 'click fraud',
  'ad fraud', 'hitman', 'assassination', 'violence', 'terrorism',
  'escort', 'sexual services', 'fake diploma', 'fake certificate',
  'impersonation', 'deepfake', 'forged documents'
] as const;

// Keywords that trigger manual review
export const REVIEW_TRIGGER_KEYWORDS = [
  'anonymous', 'untraceable', 'bypass', 'circumvent', 'scrape', 'mass',
  'bulk accounts', 'automation', 'bot network', 'proxy', 'vpn setup',
  'crypto mixing', 'tumbler', 'private', 'confidential', 'nda required',
  'urgent cash', 'wire transfer', 'western union', 'gift cards'
] as const;

// New user thresholds
export const NEW_USER_SETTINGS = {
  gigsBeforeAutoApproval: 3,
  escrowDelayHours: 48,
  establishedEscrowDelayHours: 24,
  establishedReputationThreshold: 4.0,
  establishedGigsThreshold: 5
} as const;

// Moderation status values
export const MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged'
} as const;

// Report reasons
export const REPORT_REASONS = [
  'illegal_service', 'harassment', 'fraud', 'spam',
  'inappropriate_content', 'scam', 'misleading', 'other'
] as const;

// ===========================================
// RATE LIMITING & ANTI-SPAM
// ===========================================

export const RATE_LIMITS = {
  // Everyone gets 1 free action per hour
  freeGigsPerHour: 1,
  freeApplicationsPerHour: 1,
  
  // Maximum actions per hour (including paid)
  maxGigsPerHour: 6,
  maxApplicationsPerHour: 6,
  
  // Fee for additional actions beyond free allowance
  extraActionFeeSats: 10,
  
  // Minimum time between paid actions (10 minutes = 600 seconds)
  minSecondsBetweenPaidActions: 600,
} as const;

export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];
export type ModerationStatus = typeof MODERATION_STATUS[keyof typeof MODERATION_STATUS];
export type ReportReason = typeof REPORT_REASONS[number];
