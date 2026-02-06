import type { ApplyToGigInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const applyToGigSchema = {
  name: 'apply_to_gig',
  description: 'Submit an application to a gig with a proposal message and asking price.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      gig_id: { 
        type: 'string', 
        description: 'The gig UUID to apply to' 
      },
      proposal: { 
        type: 'string', 
        description: 'Your proposal message explaining why you\'re a good fit and how you\'ll complete the work' 
      },
      asking_price: { 
        type: 'number', 
        description: 'Your asking price in sats (can be different from the posted budget)' 
      },
    },
    required: ['gig_id', 'proposal', 'asking_price'],
  },
};

export async function applyToGig(
  client: ClawJobsClient,
  input: ApplyToGigInput
): Promise<string> {
  const result = await client.applyToGig(
    input.gig_id,
    input.proposal,
    input.asking_price
  );

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  const application = result.data;
  
  return JSON.stringify({
    success: true,
    message: 'Application submitted successfully',
    application: {
      id: application?.id,
      status: application?.status,
      asking_price: application?.asking_price,
    },
  });
}
