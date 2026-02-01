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
  // Illegal goods/services
  'drugs',
  'weapons',
  'firearms',
  'explosives',
  'counterfeit',
  'stolen goods',
  
  // Hacking/Malware
  'hacking',
  'malware',
  'ransomware',
  'spyware',
  'exploit',
  'ddos',
  'phishing',
  'credential stuffing',
  'account cracking',
  'password cracking',
  
  // Personal data abuse
  'doxxing',
  'personal information',
  'ssn',
  'social security',
  'credit card numbers',
  'identity theft',
  'data breach',
  
  // Harassment/Harm
  'harassment',
  'stalking',
  'revenge porn',
  'blackmail',
  'extortion',
  'threats',
  'swatting',
  
  // Financial fraud
  'money laundering',
  'pyramid scheme',
  'ponzi',
  'pump and dump',
  'fake reviews',
  'click fraud',
  'ad fraud',
  
  // Violence
  'hitman',
  'assassination',
  'violence',
  'terrorism',
  
  // Adult content (unless platform allows)
  'escort',
  'sexual services',
  
  // Deception
  'fake diploma',
  'fake certificate',
  'impersonation',
  'deepfake',
  'forged documents'
] as const;

// Keywords that trigger manual review (suspicious but not auto-reject)
export const REVIEW_TRIGGER_KEYWORDS = [
  'anonymous',
  'untraceable',
  'bypass',
  'circumvent',
  'scrape',
  'mass',
  'bulk accounts',
  'automation',
  'bot network',
  'proxy',
  'vpn setup',
  'crypto mixing',
  'tumbler',
  'private',
  'confidential',
  'nda required',
  'urgent cash',
  'wire transfer',
  'western union',
  'gift cards'
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
  'illegal_service',
  'harassment',
  'fraud',
  'spam',
  'inappropriate_content',
  'scam',
  'misleading',
  'other'
] as const;

export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];
export type ModerationStatus = typeof MODERATION_STATUS[keyof typeof MODERATION_STATUS];
export type ReportReason = typeof REPORT_REASONS[number];

// ===========================================
// ANTI-SPAM SETTINGS
// ===========================================

export const ANTI_SPAM = {
  // Rate limits for new users (gigs completed < TRUSTED_THRESHOLD)
  newUserGigsPerHour: 1,
  newUserApplicationsPerHour: 5,
  
  // Trusted user threshold
  trustedGigsThreshold: 3,
  
  // Anti-spam fee for applications (in sats)
  // Small enough to be negligible, large enough to stop bots
  applicationFeeSats: 21, // ~$0.02, symbolic "tip" to platform
  
  // Trusted users don't pay application fee
  trustedUserFeeExempt: true,
  
  // Rate limits for trusted users (much higher)
  trustedUserGigsPerHour: 10,
  trustedUserApplicationsPerHour: 50,
} as const;
