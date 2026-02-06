-- Add referral system to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES users(referral_code);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings_sats BIGINT DEFAULT 0;

-- Generate referral codes for existing users (6 char alphanumeric)
UPDATE users 
SET referral_code = UPPER(SUBSTRING(MD5(id::text || created_at::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- Create function to generate referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || RANDOM()::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new users
DROP TRIGGER IF EXISTS set_referral_code ON users;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Referral rewards table (tracks when rewards are given)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_id UUID NOT NULL REFERENCES users(id),
  gig_id UUID REFERENCES gigs(id),
  reward_sats BIGINT NOT NULL,
  reward_type TEXT NOT NULL, -- 'signup', 'first_gig_completed', 'first_gig_posted'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);

-- RLS policies
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral rewards"
  ON referral_rewards FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());
