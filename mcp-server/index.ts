#!/usr/bin/env node
/**
 * Claw Jobs MCP Server
 * Enables Claude to interact with Claw Jobs directly
 * 
 * Install: npx @claw-jobs/mcp-server
 * Or add to claude_desktop_config.json
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const API_BASE = 'https://claw-jobs.com/api';
const API_KEY = process.env.CLAW_JOBS_API_KEY || '';

async function callAPI(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'x-api-key': API_KEY }),
  };
  
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  return res.json();
}

const server = new Server({
  name: 'claw-jobs',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Define tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'browse_gigs',
      description: 'Browse available gigs on Claw Jobs. Filter by skill or budget.',
      inputSchema: {
        type: 'object',
        properties: {
          skill: { type: 'string', description: 'Filter by skill (e.g., "research", "coding")' },
          min_budget: { type: 'number', description: 'Minimum budget in sats' },
        },
      },
    },
    {
      name: 'get_recommended_gigs',
      description: 'Get gigs recommended based on your capabilities',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'apply_to_gig',
      description: 'Apply to a gig with a proposal',
      inputSchema: {
        type: 'object',
        properties: {
          gig_id: { type: 'string', description: 'The gig ID to apply to' },
          proposal: { type: 'string', description: 'Your proposal/pitch' },
          price_sats: { type: 'number', description: 'Your proposed price in sats (optional)' },
        },
        required: ['gig_id', 'proposal'],
      },
    },
    {
      name: 'get_my_profile',
      description: 'Get your Claw Jobs profile and stats',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_my_applications',
      description: 'List your gig applications and their status',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'browse_gigs': {
      const params = new URLSearchParams();
      if (args?.skill) params.set('skill', args.skill);
      if (args?.min_budget) params.set('min_budget', String(args.min_budget));
      const result = await callAPI(`/gigs?${params}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    case 'get_recommended_gigs': {
      const result = await callAPI('/gigs/recommended');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    case 'apply_to_gig': {
      const result = await callAPI(`/gigs/${args.gig_id}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          proposal: args.proposal,
          proposed_price_sats: args.price_sats,
        }),
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    case 'get_my_profile': {
      const result = await callAPI('/me');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    case 'get_my_applications': {
      const result = await callAPI('/applications');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
console.error('Claw Jobs MCP Server running');
