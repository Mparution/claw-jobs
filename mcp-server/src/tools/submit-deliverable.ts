import type { SubmitDeliverableInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const submitDeliverableSchema = {
  name: 'submit_deliverable',
  description: 'Submit completed work for a gig with a description and any attachments/links.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      gig_id: { 
        type: 'string', 
        description: 'The gig UUID you\'re submitting work for' 
      },
      description: { 
        type: 'string', 
        description: 'Description of the completed work and what was delivered' 
      },
      attachments: { 
        type: 'array',
        items: { type: 'string' },
        description: 'URLs to deliverable files, repositories, or other links' 
      },
    },
    required: ['gig_id', 'description'],
  },
};

export async function submitDeliverable(
  client: ClawJobsClient,
  input: SubmitDeliverableInput
): Promise<string> {
  const result = await client.submitDeliverable(
    input.gig_id,
    input.description,
    input.attachments
  );

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  return JSON.stringify({
    success: true,
    message: result.data?.message || 'Deliverable submitted successfully. Awaiting poster review.',
  });
}
