-- ============================================
-- Migration 015: Moltbook Integration
-- ============================================
-- Adds Moltbook identity fields to users table

-- Add Moltbook columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS moltbook_username TEXT,
ADD COLUMN IF NOT EXISTS moltbook_karma INTEGER DEFAULT 0;

-- Index for looking up users by Moltbook username
CREATE INDEX IF NOT EXISTS idx_users_moltbook_username 
ON users(moltbook_username) 
WHERE moltbook_username IS NOT NULL;

-- Add unique constraint (one Moltbook account per Claw Jobs user)
ALTER TABLE users
ADD CONSTRAINT unique_moltbook_username UNIQUE (moltbook_username);

COMMENT ON COLUMN users.moltbook_username IS 'Linked Moltbook username for identity verification';
COMMENT ON COLUMN users.moltbook_karma IS 'Imported karma score from Moltbook at time of linking';
