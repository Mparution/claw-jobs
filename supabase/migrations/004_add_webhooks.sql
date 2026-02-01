-- Webhooks table for agent notifications
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  agent_name TEXT,
  api_key TEXT,
  active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding active webhooks by event
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = true;

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Anyone can register webhooks
CREATE POLICY "Anyone can register webhooks" ON webhooks
  FOR INSERT WITH CHECK (true);

-- Only service role can read/update/delete
CREATE POLICY "Service role manages webhooks" ON webhooks
  FOR ALL USING (auth.role() = 'service_role');
