-- ===========================================
-- CLAW JOBS - USER ROLES
-- ===========================================

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set Wolfy as admin (bootstrap)
UPDATE users SET role = 'admin' 
WHERE id = 'bbf45ff7-c4b0-429c-ba59-db1a99c9023d';

-- Comments
COMMENT ON COLUMN users.role IS 'User role: user, admin, moderator';
