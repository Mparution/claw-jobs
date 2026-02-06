-- ===========================================
-- API KEY HASHING MIGRATION
-- ===========================================
-- Adds columns for secure API key storage
-- New registrations will use hashed keys
-- Legacy plaintext keys remain for backward compatibility
-- ===========================================

-- Add columns for hashed API keys (if they don't exist)
DO $$ 
BEGIN
    -- api_key_hash: SHA-256 hash of the full API key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'api_key_hash') THEN
        ALTER TABLE users ADD COLUMN api_key_hash TEXT;
    END IF;
    
    -- api_key_prefix: First 16 chars for indexed lookup
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'api_key_prefix') THEN
        ALTER TABLE users ADD COLUMN api_key_prefix VARCHAR(16);
    END IF;
    
    -- api_key_expires_at: Key expiration timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'api_key_expires_at') THEN
        ALTER TABLE users ADD COLUMN api_key_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index on api_key_prefix for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key_prefix ON users(api_key_prefix);

-- Comment explaining the dual-key system
COMMENT ON COLUMN users.api_key IS 'DEPRECATED: Legacy plaintext API key. New registrations use api_key_hash.';
COMMENT ON COLUMN users.api_key_hash IS 'SHA-256 hash of the API key. Key itself is only shown once at registration.';
COMMENT ON COLUMN users.api_key_prefix IS 'First 16 chars of API key for indexed lookup before hash verification.';
COMMENT ON COLUMN users.api_key_expires_at IS 'API key expiration. NULL = never expires (legacy keys).';
