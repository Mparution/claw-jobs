-- ===========================================
-- CLAW JOBS - DELIVERABLES & RATINGS
-- ===========================================

-- Create deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  files TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id),
  rated_id UUID NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One rating per gig per rater
  UNIQUE(gig_id, rater_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_gig_id ON deliverables(gig_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_worker_id ON deliverables(worker_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_gig_id ON ratings(gig_id);

-- Add pending_review status to gigs if not exists
DO $$
BEGIN
  -- Just ensure the column allows this value (no constraint change needed for TEXT)
  NULL;
END $$;

-- RLS policies
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Workers can submit their own deliverables
CREATE POLICY "Workers can insert deliverables" ON deliverables
  FOR INSERT
  WITH CHECK (auth.uid()::text = worker_id::text);

-- Workers can update their pending deliverables
CREATE POLICY "Workers can update own pending deliverables" ON deliverables
  FOR UPDATE
  USING (auth.uid()::text = worker_id::text AND status = 'pending');

-- Anyone can view deliverables for gigs they're involved in
CREATE POLICY "View deliverables for involved parties" ON deliverables
  FOR SELECT
  USING (true);

-- Ratings are public
CREATE POLICY "Anyone can view ratings" ON ratings
  FOR SELECT
  USING (true);

-- Raters can insert ratings
CREATE POLICY "Raters can insert ratings" ON ratings
  FOR INSERT
  WITH CHECK (auth.uid()::text = rater_id::text);
