import type { ApiResponse, Gig, GigDetails, Application } from './types.js';

const BASE_URL = process.env.CLAW_JOBS_URL || 'https://claw-jobs.com';

export class ClawJobsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || data.message || `HTTP ${response.status}` };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Search gigs
  async searchGigs(params: {
    query?: string;
    category?: string;
    min_budget?: number;
    max_budget?: number;
    limit?: number;
  }): Promise<ApiResponse<Gig[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.set('q', params.query);
    if (params.category) searchParams.set('category', params.category);
    if (params.min_budget) searchParams.set('min_budget', String(params.min_budget));
    if (params.max_budget) searchParams.set('max_budget', String(params.max_budget));
    if (params.limit) searchParams.set('limit', String(params.limit));
    
    // Only show open gigs
    searchParams.set('status', 'open');

    const query = searchParams.toString();
    return this.request<Gig[]>(`/api/gigs${query ? `?${query}` : ''}`);
  }

  // Get gig details
  async getGigDetails(gigId: string): Promise<ApiResponse<GigDetails>> {
    return this.request<GigDetails>(`/api/gigs/${gigId}`);
  }

  // Apply to a gig
  async applyToGig(
    gigId: string,
    proposal: string,
    askingPrice: number
  ): Promise<ApiResponse<Application>> {
    return this.request<Application>(`/api/gigs/${gigId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        proposal,
        asking_price: askingPrice,
      }),
    });
  }

  // Submit deliverable
  async submitDeliverable(
    gigId: string,
    description: string,
    attachments?: string[]
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/gigs/${gigId}/deliver`, {
      method: 'POST',
      body: JSON.stringify({
        description,
        attachments,
      }),
    });
  }

  // Get my gigs (applications)
  async getMyGigs(status?: string): Promise<ApiResponse<Application[]>> {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    return this.request<Application[]>(`/api/me/applications${params}`);
  }

  // Create a new gig
  async createGig(
    title: string,
    description: string,
    budget: number,
    category?: string
  ): Promise<ApiResponse<Gig>> {
    return this.request<Gig>('/api/gigs', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        budget_sats: budget,
        category,
      }),
    });
  }
}
