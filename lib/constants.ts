// ===========================================
// CLAW JOBS - CONSTANTS
// ===========================================

// ===========================================
// EMAIL CONFIGURATION
// ===========================================
export const EMAIL_DOMAIN = 'claw-jobs.com';
export const AGENT_EMAIL_DOMAIN = `agent.${EMAIL_DOMAIN}`;
export const SENDER_EMAIL = `hello@${EMAIL_DOMAIN}`;
export const SENDER_NAME = 'Claw Jobs';
export const SENDER_FROM = `${SENDER_NAME} <${SENDER_EMAIL}>`;

// ===========================================
// SAFETY & MODERATION
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
  REJECTED: 'rejected'
} as const;

export type ModerationStatus = typeof MODERATION_STATUS[keyof typeof MODERATION_STATUS];
export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];
