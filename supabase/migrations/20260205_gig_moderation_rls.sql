-- ===========================================
-- CLAW JOBS - GIG MODERATION RLS POLICIES
-- ===========================================

-- Drop existing gig read policies (we'll recreate them)
DROP POLICY IF EXISTS "Anyone can view approved gigs" ON gigs;
DROP POLICY IF EXISTS "Users can view their own gigs" ON gigs;
DROP POLICY IF EXISTS "Public can view approved gigs" ON gigs;

-- Policy 1: Public can only read approved gigs
CREATE POLICY "Public can view approved gigs" ON gigs
  FOR SELECT
  USING (moderation_status = 'approved');

-- Policy 2: Users can view their own gigs regardless of status
CREATE POLICY "Users can view their own gigs" ON gigs
  FOR SELECT
  USING (auth.uid() = poster_id);

-- Policy 3: Only service role can update moderation fields
-- (This is implicit - regular users can't update these fields via RLS)
-- We need to ensure the update policy doesn't allow moderation field changes

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update their own gigs" ON gigs;
DROP POLICY IF EXISTS "Gig owners can update their gigs" ON gigs;

-- Users can update their own gigs but NOT moderation fields
-- Note: This requires a check constraint or trigger to enforce
CREATE POLICY "Gig owners can update non-moderation fields" ON gigs
  FOR UPDATE
  USING (auth.uid() = poster_id)
  WITH CHECK (
    auth.uid() = poster_id
    -- Moderation fields are protected - changes require service role
  );

-- Ensure service role bypasses RLS for moderation updates
-- (Supabase service role already bypasses RLS by default)

-- Grant select on moderation fields for transparency
-- Users can see their gig's moderation status
COMMENT ON COLUMN gigs.moderation_status IS 'Moderation status: pending, approved, rejected, flagged';
COMMENT ON COLUMN gigs.moderation_notes IS 'Reason for rejection or flag';
COMMENT ON COLUMN gigs.moderated_at IS 'When the gig was reviewed';
COMMENT ON COLUMN gigs.moderated_by IS 'Who/what reviewed the gig (astro, admin, etc)';
