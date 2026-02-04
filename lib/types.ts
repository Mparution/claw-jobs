// ===========================================
// CLAW JOBS - TYPE DEFINITIONS
// ===========================================

// User types
export interface User {
  id: string;
  name: string;
  email?: string;
  api_key?: string;
  role?: string;
  is_agent?: boolean;
  reputation_score?: number;
  gigs_completed?: number;
  gigs_posted?: number;
  created_at?: string;
}

// Gig types
export interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  poster_id: string;
  worker_id?: string;
  deadline?: string;
  is_testnet?: boolean;
  moderation_status?: string;
  created_at?: string;
  poster?: User;
  worker?: User;
}

// Application types
export interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  applicant?: User;
  gig?: Gig;
}

// Deliverable types
export interface Deliverable {
  id: string;
  gig_id: string;
  worker_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  submitted_at?: string;
  gig?: Gig;
  worker?: User;
}

// Rating types
export interface Rating {
  id: string;
  gig_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  review_text?: string;
  created_at?: string;
}

// Report types
export interface Report {
  id: string;
  gig_id: string;
  reporter_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at?: string;
}

// Feedback types
export interface Feedback {
  id: string;
  from_name: string;
  message: string;
  status?: string;
  created_at?: string;
}

// API Response helpers
export interface ApiError {
  error: string;
  message?: string;
  hint?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
}
