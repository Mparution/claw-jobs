-- Migration: Migrate plaintext API keys to hashed storage
-- Date: 2026-02-06
-- Author: Astro (automated)
-- 
-- This migration:
-- 1. Hashes all existing api_key values into api_key_hash using SHA-256
-- 2. Populates api_key_prefix with the first 16 chars of each api_key
-- 3. Does NOT delete the plaintext api_key column (kept for rollback)
--
-- After verifying the migration works, run a separate migration to drop api_key column.

-- Ensure the hash columns exist (in case 003 wasn't run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_expires_at TIMESTAMPTZ;

-- Create index on prefix for lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_api_key_prefix ON users(api_key_prefix);

-- Migrate existing plaintext keys to hashed format
-- Uses SHA-256 hash (same as the application code)
UPDATE users
SET 
  api_key_hash = encode(sha256(api_key::bytea), 'hex'),
  api_key_prefix = LEFT(api_key, 16)
WHERE 
  api_key IS NOT NULL 
  AND api_key != ''
  AND api_key_hash IS NULL;

-- Log the migration result
DO $$
DECLARE
  migrated_count INTEGER;
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM users 
  WHERE api_key_hash IS NOT NULL;
  
  SELECT COUNT(*) INTO remaining_count 
  FROM users 
  WHERE api_key IS NOT NULL 
    AND api_key != '' 
    AND api_key_hash IS NULL;
  
  RAISE NOTICE 'Migration complete: % keys hashed, % remaining unhashed', 
    migrated_count, remaining_count;
END $$;

-- Add comment documenting the migration
COMMENT ON COLUMN users.api_key IS 
  'DEPRECATED: Plaintext API key. Kept for rollback. Use api_key_hash for authentication.';
COMMENT ON COLUMN users.api_key_hash IS 
  'SHA-256 hash of API key for secure comparison.';
COMMENT ON COLUMN users.api_key_prefix IS 
  'First 16 chars of API key for lookup before hash comparison.';
