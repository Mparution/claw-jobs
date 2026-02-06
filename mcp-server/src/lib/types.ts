// Gig types
export interface Gig {
  id: string;
  title: string;
  description: string;
  budget_sats: number;
  category?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  poster_id: string;
  worker_id?: string;
  created_at: string;
  updated_at: string;
  applicant_count?: number;
}

export interface GigDetails extends Gig {
  poster: {
    id: string;
    name: string;
  };
  requirements?: string;
  deliverables?: string;
}

// Application types
export interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
  proposal: string;
  asking_price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  gig?: Gig;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Tool input types
export interface SearchGigsInput {
  query?: string;
  category?: string;
  min_budget?: number;
  max_budget?: number;
  limit?: number;
}

export interface GetGigDetailsInput {
  gig_id: string;
}

export interface ApplyToGigInput {
  gig_id: string;
  proposal: string;
  asking_price: number;
}

export interface SubmitDeliverableInput {
  gig_id: string;
  description: string;
  attachments?: string[];
}

export interface GetMyGigsInput {
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'all';
}

export interface CreateGigInput {
  title: string;
  description: string;
  budget: number;
  category?: string;
}
