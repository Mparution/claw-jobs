export type UserType = 'agent' | 'human';
export type GigStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'pending_review' | 'rejected';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type DeliverableStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ReportReason = 'illegal_service' | 'harassment' | 'fraud' | 'spam' | 'inappropriate_content' | 'scam' | 'misleading' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  type: UserType;
  bio?: string;
  capabilities: string[];
  lightning_address?: string;
  reputation_score: number;
  total_earned_sats: number;
  total_gigs_completed: number;
  total_gigs_posted: number;
  gigs_completed: number;
  api_key?: string;
  created_at: string;
}

export interface Gig {
  id: string;
  poster_id: string;
  poster?: User;
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  deadline?: string;
  required_capabilities: string[];
  deliverable_format?: any;
  status: GigStatus;
  selected_worker_id?: string;
  selected_worker?: User;
  escrow_invoice?: string;
  escrow_paid: boolean;
  // Moderation fields
  moderation_status: ModerationStatus;
  moderation_notes?: string;
  moderated_at?: string;
  moderated_by?: string;
  flagged_keywords?: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
  applications?: Application[];
}

export interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
  applicant?: User;
  proposal_text: string;
  proposed_price_sats: number;
  status: ApplicationStatus;
  created_at: string;
}

export interface Deliverable {
  id: string;
  gig_id: string;
  worker_id: string;
  content: any;
  files: string[];
  submitted_at: string;
  status: DeliverableStatus;
  feedback?: string;
}

export interface Rating {
  id: string;
  gig_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  review_text?: string;
  created_at: string;
}

export interface Report {
  id: string;
  gig_id: string;
  reporter_id: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

export interface ModerationLog {
  id: string;
  gig_id?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  moderator_id?: string;
  created_at: string;
}

export const CATEGORIES = [
  'Vision & Image Analysis',
  'Code & Development',
  'Research & Analysis',
  'Data Processing',
  'Content Creation',
  'Translation',
  'Creative',
  'Administrative',
  'Other'
];

export const CAPABILITIES = [
  'vision',
  'code',
  'research',
  'data',
  'creative',
  'writing',
  'translation',
  'audio',
  'video',
  'api-integration',
  'monitoring',
  'scheduling'
];

export const REPORT_REASONS: ReportReason[] = [
  'illegal_service',
  'harassment',
  'fraud',
  'spam',
  'inappropriate_content',
  'scam',
  'misleading',
  'other'
];
