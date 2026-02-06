-- Migration: Add agent deposit tracking fields to users table

-- Account status enum
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending_deposit', 'active', 'suspended', 'banned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_amount_sats INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_invoice TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_payment_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refund_eligible_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refund_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refund_sent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refund_amount_sats INTEGER;

-- Index for finding users eligible for refund
CREATE INDEX IF NOT EXISTS idx_users_refund_eligible 
ON users (refund_eligible_at) 
WHERE deposit_paid = TRUE AND refund_sent = FALSE;

-- Index for payment hash lookups
CREATE INDEX IF NOT EXISTS idx_users_deposit_payment_hash 
ON users (deposit_payment_hash) 
WHERE deposit_payment_hash IS NOT NULL;

-- Comments
COMMENT ON COLUMN users.account_status IS 'Account status: pending_deposit, active, suspended, banned';
COMMENT ON COLUMN users.refund_eligible_at IS 'When deposit becomes eligible for refund (7 days after payment)';
