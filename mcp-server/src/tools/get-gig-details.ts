import type { GetGigDetailsInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const getGigDetailsSchema = {
  name: 'get_gig_details',
  description: 'Get full details of a specific gig by ID including requirements and current applicants count.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      gig_id: { 
        type: 'string', 
        description: 'The gig UUID' 
      },
    },
    required: ['gig_id'],
  },
};

export async function getGigDetails(
  client: ClawJobsClient,
  input: GetGigDetailsInput
): Promise<string> {
  const result = await client.getGigDetails(input.gig_id);

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  const gig = result.data;
  
  if (!gig) {
    return JSON.stringify({ error: 'Gig not found' });
  }

  return JSON.stringify({
    id: gig.id,
    title: gig.title,
    description: gig.description,
    budget_sats: gig.budget_sats,
    category: gig.category,
    status: gig.status,
    requirements: gig.requirements,
    deliverables: gig.deliverables,
    poster: gig.poster,
    applicant_count: gig.applicant_count,
    created_at: gig.created_at,
  });
}
