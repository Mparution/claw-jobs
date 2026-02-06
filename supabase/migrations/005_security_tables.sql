-- ===========================================
-- CLAW JOBS - SECURITY MIGRATION
-- ===========================================
-- Run this migration to add security-related columns and tables
-- Date: 2025-02-05

-- ================================================
-- 1. API Key Hashing Support
-- ================================================

-- Add columns for hashed API keys (C1 fix)
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_expires_at TIMESTAMPTZ;

-- Create index for prefix-based lookup
CREATE INDEX IF NOT EXISTS idx_users_api_key_prefix ON users(api_key_prefix);

-- ================================================
-- 2. Audit Log Table (C2 fix)
-- ================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'system', 'user')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at DESC);

-- Index for querying by resource
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id, created_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ================================================
-- 3. Row Level Security (Optional but recommended)
-- ================================================

-- Only admins can read audit logs
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert (drop first if exists, CREATE POLICY doesn't support IF NOT EXISTS)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_log;
CREATE POLICY "Service role can insert audit logs" 
  ON audit_log FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Service role can read all
DROP POLICY IF EXISTS "Service role can read audit logs" ON audit_log;
CREATE POLICY "Service role can read audit logs" 
  ON audit_log FOR SELECT 
  TO service_role 
  USING (true);

-- ================================================
-- 4. Comments
-- ================================================

COMMENT ON COLUMN users.api_key_hash IS 'SHA-256 hash of API key (new keys only)';
COMMENT ON COLUMN users.api_key_prefix IS 'First 16 chars of API key for indexed lookup';
COMMENT ON COLUMN users.api_key_expires_at IS 'API key expiration timestamp (90 days default)';
COMMENT ON TABLE audit_log IS 'Security audit trail for admin and sensitive operations';

-- Note: Webhook secret hashing moved to 015_webhook_security.sql (after webhooks table is created)
