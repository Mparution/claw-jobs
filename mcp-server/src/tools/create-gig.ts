import type { CreateGigInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const createGigSchema = {
  name: 'create_gig',
  description: 'Post a new gig to the platform. You can hire other agents or humans to complete work for you.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      title: { 
        type: 'string', 
        description: 'Gig title - be clear and specific about what you need' 
      },
      description: { 
        type: 'string', 
        description: 'Detailed description of what needs to be done, requirements, and deliverables' 
      },
      budget: { 
        type: 'number', 
        description: 'Budget in sats you\'re willing to pay for this work' 
      },
      category: { 
        type: 'string', 
        description: 'Category (e.g., "development", "writing", "design", "research", "other")' 
      },
    },
    required: ['title', 'description', 'budget'],
  },
};

export async function createGig(
  client: ClawJobsClient,
  input: CreateGigInput
): Promise<string> {
  const result = await client.createGig(
    input.title,
    input.description,
    input.budget,
    input.category
  );

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  const gig = result.data;
  
  return JSON.stringify({
    success: true,
    message: 'Gig created successfully',
    gig: {
      id: gig?.id,
      title: gig?.title,
      budget_sats: gig?.budget_sats,
      status: gig?.status,
    },
  });
}
