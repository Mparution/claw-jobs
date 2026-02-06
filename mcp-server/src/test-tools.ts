#!/usr/bin/env tsx
/**
 * Test script for MCP server tools
 * Run with: npx tsx src/test-tools.ts
 * 
 * Note: Requires CLAW_JOBS_API_KEY environment variable
 * For local testing, you can use a test API key from claw-jobs.com
 */

import { ClawJobsClient } from './lib/api-client.js';
import { searchGigs } from './tools/search-gigs.js';
import { getGigDetails } from './tools/get-gig-details.js';
import { applyToGig } from './tools/apply-to-gig.js';
import { submitDeliverable } from './tools/submit-deliverable.js';
import { getMyGigs } from './tools/get-my-gigs.js';
import { createGig } from './tools/create-gig.js';

const apiKey = process.env.CLAW_JOBS_API_KEY;
if (!apiKey) {
  console.error('❌ CLAW_JOBS_API_KEY environment variable is required');
  console.error('   Get your API key at https://claw-jobs.com/settings');
  process.exit(1);
}

const client = new ClawJobsClient(apiKey);

async function runTests() {
  console.log('🧪 Testing MCP Server Tools\n');
  console.log('=' .repeat(50));

  // Test 1: search_gigs
  console.log('\n📋 Test 1: search_gigs (query: "writing")');
  try {
    const searchResult = await searchGigs(client, { query: 'writing', limit: 5 });
    console.log('Result:', searchResult);
  } catch (e) {
    console.log('Error:', e);
  }

  // Test 2: create_gig
  console.log('\n📋 Test 2: create_gig');
  let createdGigId: string | undefined;
  try {
    const createResult = await createGig(client, {
      title: '[TEST] MCP Integration Test Gig',
      description: 'This is a test gig created by the MCP server test script. Please ignore.',
      budget: 1000,
      category: 'other',
    });
    console.log('Result:', createResult);
    const parsed = JSON.parse(createResult);
    createdGigId = parsed.gig?.id;
  } catch (e) {
    console.log('Error:', e);
  }

  // Test 3: get_gig_details
  console.log('\n📋 Test 3: get_gig_details');
  try {
    // Use the created gig or a placeholder UUID
    const gigId = createdGigId || '00000000-0000-0000-0000-000000000000';
    const detailsResult = await getGigDetails(client, { gig_id: gigId });
    console.log('Result:', detailsResult);
  } catch (e) {
    console.log('Error:', e);
  }

  // Test 4: apply_to_gig
  console.log('\n📋 Test 4: apply_to_gig');
  try {
    // Note: This will fail if trying to apply to own gig, which is expected
    const gigId = createdGigId || '00000000-0000-0000-0000-000000000000';
    const applyResult = await applyToGig(client, {
      gig_id: gigId,
      proposal: 'Test proposal from MCP server integration test',
      asking_price: 900,
    });
    console.log('Result:', applyResult);
  } catch (e) {
    console.log('Error:', e);
  }

  // Test 5: get_my_gigs
  console.log('\n📋 Test 5: get_my_gigs (status: "all")');
  try {
    const myGigsResult = await getMyGigs(client, { status: 'all' });
    console.log('Result:', myGigsResult);
  } catch (e) {
    console.log('Error:', e);
  }

  // Test 6: submit_deliverable
  console.log('\n📋 Test 6: submit_deliverable');
  try {
    // This will fail if not the assigned worker, which is expected
    const gigId = createdGigId || '00000000-0000-0000-0000-000000000000';
    const deliverResult = await submitDeliverable(client, {
      gig_id: gigId,
      description: 'Test deliverable from MCP server integration test',
      attachments: ['https://example.com/test-file.txt'],
    });
    console.log('Result:', deliverResult);
  } catch (e) {
    console.log('Error:', e);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tool tests completed');
  console.log('\nNote: Some tests may show errors - this is expected when:');
  console.log('  - Trying to apply to your own gig');
  console.log('  - Trying to submit deliverable when not assigned');
  console.log('  - Using placeholder gig IDs');
}

runTests().catch(console.error);
