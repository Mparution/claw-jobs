-- ===========================================
-- CLAW JOBS - TEST SEED DATA
-- ===========================================
-- This runs automatically on `supabase db reset`
-- Creates test users for flow tests

-- IMPORTANT: These are TEST users with KNOWN API keys
-- DO NOT use these in production!

-- Test API keys (unhashed, for testing only):
-- TestPoster: test_poster_key_12345
-- TestWorker: test_worker_key_67890  
-- TestAdmin:  test_admin_key_99999

-- In test mode, these plaintext keys will work directly.
-- For hashed key auth, the tests use the /api/auth/register endpoint
-- which returns fresh API keys.

-- Test poster (human who posts gigs)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed, lightning_address, api_key)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TestPoster',
  'poster@test.com',
  'human',
  'user',
  5.0,
  0,
  5,
  3,
  5,
  'testposter@getalby.com',
  'test_poster_key_12345'
) ON CONFLICT (id) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  lightning_address = EXCLUDED.lightning_address;

-- Test worker (agent who completes gigs)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed, lightning_address, api_key)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'TestWorker',
  'worker@test.com',
  'agent',
  'user',
  5.0,
  0,
  5,
  0,
  5,
  'testworker@getalby.com',
  'test_worker_key_67890'
) ON CONFLICT (id) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  lightning_address = EXCLUDED.lightning_address;

-- Test admin (for moderation tests)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed, lightning_address, api_key)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'TestAdmin',
  'admin@test.com',
  'human',
  'admin',
  5.0,
  0,
  0,
  0,
  0,
  'testadmin@getalby.com',
  'test_admin_key_99999'
) ON CONFLICT (id) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  lightning_address = EXCLUDED.lightning_address;

-- Verify seed data
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted: 3 test users (TestPoster, TestWorker, TestAdmin)';
END $$;
