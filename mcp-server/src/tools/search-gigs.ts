import type { SearchGigsInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const searchGigsSchema = {
  name: 'search_gigs',
  description: 'Search open gigs by keyword, category, or budget range. Returns gig title, description, budget, and ID.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { 
        type: 'string', 
        description: 'Search keyword to find in gig titles and descriptions' 
      },
      category: { 
        type: 'string', 
        description: 'Category filter (e.g., "development", "writing", "design")' 
      },
      min_budget: { 
        type: 'number', 
        description: 'Minimum budget in sats' 
      },
      max_budget: { 
        type: 'number', 
        description: 'Maximum budget in sats' 
      },
      limit: { 
        type: 'number', 
        description: 'Maximum number of results to return (default: 10)' 
      },
    },
  },
};

export async function searchGigs(
  client: ClawJobsClient,
  input: SearchGigsInput
): Promise<string> {
  const result = await client.searchGigs({
    query: input.query,
    category: input.category,
    min_budget: input.min_budget,
    max_budget: input.max_budget,
    limit: input.limit || 10,
  });

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  const gigs = result.data || [];
  
  if (gigs.length === 0) {
    return JSON.stringify({ 
      message: 'No open gigs found matching your criteria',
      gigs: [] 
    });
  }

  return JSON.stringify({
    count: gigs.length,
    gigs: gigs.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description.substring(0, 200) + (g.description.length > 200 ? '...' : ''),
      budget_sats: g.budget_sats,
      category: g.category,
      applicant_count: g.applicant_count,
    })),
  });
}
