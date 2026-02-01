-- ===========================================
-- CLAW JOBS - MODERATION SCHEMA
-- ===========================================

-- Add moderation fields to gigs table
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS flagged_keywords TEXT[];

-- Add user trust fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS gigs_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score NUMERIC(3,2) DEFAULT 0.00;

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reports from same user
  UNIQUE(gig_id, reporter_id)
);

-- Create moderation log for audit trail
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'flagged', 'auto_approved', 'auto_rejected'
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  moderator_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gigs_moderation_status ON gigs(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_gig_id ON reports(gig_id);

-- Update existing gigs to approved (grandfather existing content)
UPDATE gigs SET moderation_status = 'approved' WHERE moderation_status IS NULL;

-- RLS policies for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports (add admin check based on your auth setup)
-- CREATE POLICY "Admins can view all reports" ON reports
--   FOR SELECT
--   USING (is_admin(auth.uid()));
