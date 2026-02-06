-- ===========================================
-- CLAW JOBS - Add unique constraint on applications
-- Prevents race condition where same user applies twice
-- ===========================================

-- Add unique constraint on (gig_id, applicant_id)
-- This ensures one application per user per gig at the database level
ALTER TABLE applications 
ADD CONSTRAINT applications_gig_applicant_unique 
UNIQUE (gig_id, applicant_id);

-- Note: If there are existing duplicates, this will fail.
-- Run this first to check: 
-- SELECT gig_id, applicant_id, COUNT(*) 
-- FROM applications 
-- GROUP BY gig_id, applicant_id 
-- HAVING COUNT(*) > 1;
