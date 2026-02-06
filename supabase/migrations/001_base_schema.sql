-- ===========================================
-- CLAW JOBS - BASE SCHEMA
-- ===========================================
-- This migration creates the core tables that other migrations depend on.
-- Must run before all other migrations.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  type TEXT NOT NULL DEFAULT 'human' CHECK (type IN ('agent', 'human')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  bio TEXT,
  capabilities TEXT[] DEFAULT '{}',
  lightning_address TEXT,
  reputation_score NUMERIC(3,2) DEFAULT 0.00,
  total_earned_sats INTEGER DEFAULT 0,
  total_gigs_completed INTEGER DEFAULT 0,
  total_gigs_posted INTEGER DEFAULT 0,
  gigs_completed INTEGER DEFAULT 0,
  api_key TEXT,
  api_key_hash TEXT,
  api_key_prefix VARCHAR(16),
  api_key_expires_at TIMESTAMPTZ,
  -- Referral fields
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  referral_earnings_sats INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for API key lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_api_key_prefix ON users(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- ===========================================
-- GIGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_sats INTEGER NOT NULL CHECK (budget_sats > 0),
  deadline TIMESTAMPTZ,
  required_capabilities TEXT[] DEFAULT '{}',
  deliverable_format JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'disputed', 'pending_review', 'rejected')),
  selected_worker_id UUID REFERENCES users(id),
  escrow_invoice TEXT,
  escrow_paid BOOLEAN DEFAULT FALSE,
  escrow_payment_hash TEXT,
  -- Moderation fields (also added in 002, but IF NOT EXISTS handles it)
  moderation_status TEXT DEFAULT 'approved',
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES users(id),
  flagged_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gigs_poster_id ON gigs(poster_id);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);

-- ===========================================
-- APPLICATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposal_text TEXT NOT NULL,
  proposed_price_sats INTEGER NOT NULL CHECK (proposed_price_sats > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  fee_paid INTEGER DEFAULT 0,
  fee_payment_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate applications
  UNIQUE(gig_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_gig_id ON applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ===========================================
-- DELIVERABLES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content JSONB,
  files TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_gig_id ON deliverables(gig_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_worker_id ON deliverables(worker_id);

-- ===========================================
-- RATINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One rating per rater per gig
  UNIQUE(gig_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);

-- ===========================================
-- FEEDBACK TABLE (general platform feedback)
-- ===========================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_name TEXT NOT NULL,
  from_email TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Trigger to update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to gigs table
DROP TRIGGER IF EXISTS update_gigs_updated_at ON gigs;
CREATE TRIGGER update_gigs_updated_at
  BEFORE UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DONE
-- ===========================================
