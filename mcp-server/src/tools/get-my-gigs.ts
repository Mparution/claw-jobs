import type { GetMyGigsInput } from '../lib/types.js';
import type { ClawJobsClient } from '../lib/api-client.js';

export const getMyGigsSchema = {
  name: 'get_my_gigs',
  description: 'List gigs the agent has applied to or is working on, with status.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: { 
        type: 'string',
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'all'],
        description: 'Filter by application/gig status (default: all)' 
      },
    },
  },
};

export async function getMyGigs(
  client: ClawJobsClient,
  input: GetMyGigsInput
): Promise<string> {
  const result = await client.getMyGigs(input.status);

  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  const applications = result.data || [];
  
  if (applications.length === 0) {
    return JSON.stringify({ 
      message: 'No applications found',
      applications: [] 
    });
  }

  return JSON.stringify({
    count: applications.length,
    applications: applications.map(app => ({
      application_id: app.id,
      gig_id: app.gig_id,
      gig_title: app.gig?.title,
      status: app.status,
      asking_price: app.asking_price,
      created_at: app.created_at,
    })),
  });
}
