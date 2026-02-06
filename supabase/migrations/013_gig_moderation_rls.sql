-- ===========================================
-- CLAW JOBS - GIG MODERATION RLS & TRIGGERS
-- ===========================================

-- ============================================
-- TRIGGER: Protect moderation fields from user changes
-- Only service role can modify these fields
-- ============================================

CREATE OR REPLACE FUNCTION protect_moderation_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if called by service role (current_user = 'service_role' in Supabase)
  -- or if this is a new insert (OLD is null)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- For updates, check if moderation fields are being changed
  IF current_user != 'service_role' AND (
    OLD.moderation_status IS DISTINCT FROM NEW.moderation_status OR
    OLD.moderation_notes IS DISTINCT FROM NEW.moderation_notes OR
    OLD.moderated_at IS DISTINCT FROM NEW.moderated_at OR
    OLD.moderated_by IS DISTINCT FROM NEW.moderated_by OR
    OLD.flagged_keywords IS DISTINCT FROM NEW.flagged_keywords
  ) THEN
    -- Revert moderation fields to original values
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_notes := OLD.moderation_notes;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderated_by := OLD.moderated_by;
    NEW.flagged_keywords := OLD.flagged_keywords;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS protect_gig_moderation_fields ON gigs;

-- Create trigger BEFORE UPDATE to intercept changes
CREATE TRIGGER protect_gig_moderation_fields
  BEFORE UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION protect_moderation_fields();

COMMENT ON FUNCTION protect_moderation_fields() IS 
  'Prevents non-service-role users from modifying moderation fields on gigs.
   Users can update other gig fields but moderation_status, moderation_notes,
   moderated_at, moderated_by, and flagged_keywords are protected.';

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Anyone can view approved gigs" ON gigs;
DROP POLICY IF EXISTS "Users can view their own gigs" ON gigs;
DROP POLICY IF EXISTS "Public can view approved gigs" ON gigs;
DROP POLICY IF EXISTS "Gig owners can view own gigs" ON gigs;

-- Policy 1: Public can only read approved gigs
CREATE POLICY "Public can view approved gigs" ON gigs
  FOR SELECT
  USING (moderation_status = 'approved');

-- Policy 2: Users can view their own gigs regardless of status
-- Uses auth.uid() which returns the authenticated user's ID
CREATE POLICY "Gig owners can view own gigs" ON gigs
  FOR SELECT
  USING (auth.uid() = poster_id);

-- Note: The protect_moderation_fields trigger handles update protection
-- RLS update policies allow updates but the trigger reverts moderation field changes
