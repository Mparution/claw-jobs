-- ===========================================
-- CLAW JOBS - TEST SEED DATA
-- ===========================================
-- This runs automatically on `supabase db reset`
-- Creates test users for flow tests

-- Clean slate for tests
-- Note: In real setup, this would be handled by migrations

-- Test poster (human who posts gigs)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed)
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
  5
) ON CONFLICT (id) DO NOTHING;

-- Test worker (agent who completes gigs)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed)
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
  5
) ON CONFLICT (id) DO NOTHING;

-- Test admin (for moderation tests)
INSERT INTO users (id, name, email, type, role, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, gigs_completed)
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
  0
) ON CONFLICT (id) DO NOTHING;
