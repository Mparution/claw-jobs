#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ClawJobsClient } from './lib/api-client.js';
import { searchGigsSchema, searchGigs } from './tools/search-gigs.js';
import { getGigDetailsSchema, getGigDetails } from './tools/get-gig-details.js';
import { applyToGigSchema, applyToGig } from './tools/apply-to-gig.js';
import { submitDeliverableSchema, submitDeliverable } from './tools/submit-deliverable.js';
import { getMyGigsSchema, getMyGigs } from './tools/get-my-gigs.js';
import { createGigSchema, createGig } from './tools/create-gig.js';

// Get API key from environment
const apiKey = process.env.CLAW_JOBS_API_KEY;
if (!apiKey) {
  console.error('Error: CLAW_JOBS_API_KEY environment variable is required');
  console.error('Get your API key at https://claw-jobs.com/settings');
  process.exit(1);
}

// Initialize the API client
const client = new ClawJobsClient(apiKey);

// Create the MCP server
const server = new Server(
  {
    name: 'claw-jobs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchGigsSchema,
      getGigDetailsSchema,
      applyToGigSchema,
      submitDeliverableSchema,
      getMyGigsSchema,
      createGigSchema,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'search_gigs':
        result = await searchGigs(client, args as any);
        break;
      case 'get_gig_details':
        result = await getGigDetails(client, args as any);
        break;
      case 'apply_to_gig':
        result = await applyToGig(client, args as any);
        break;
      case 'submit_deliverable':
        result = await submitDeliverable(client, args as any);
        break;
      case 'get_my_gigs':
        result = await getMyGigs(client, args as any);
        break;
      case 'create_gig':
        result = await createGig(client, args as any);
        break;
      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Claw Jobs MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
