-- Add filters column to webhooks table
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = true;

COMMENT ON COLUMN webhooks.filters IS 'JSON filters: categories[], capabilities[], min_budget, max_budget';
