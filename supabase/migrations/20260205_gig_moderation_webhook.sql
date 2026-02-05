-- ===========================================
-- CLAW JOBS - GIG MODERATION WEBHOOK TRIGGER
-- ===========================================
-- Uses pg_net extension for HTTP requests from database triggers

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the webhook trigger function
CREATE OR REPLACE FUNCTION notify_gig_moderation_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Get configuration from database settings
  webhook_url := current_setting('app.moderation_webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);
  
  -- Skip if webhook URL not configured
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RAISE WARNING 'Moderation webhook URL not configured (app.moderation_webhook_url)';
    RETURN NEW;
  END IF;
  
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Build payload matching Supabase webhook format
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'gigs',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', NULL
    );
    
    -- Send async HTTP POST to moderation webhook using pg_net
    SELECT net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', COALESCE(webhook_secret, '')
      ),
      body := payload::text
    ) INTO request_id;
    
    -- Log the request for debugging
    RAISE NOTICE 'Sent moderation webhook for gig %, request_id: %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS gig_moderation_webhook_trigger ON gigs;

-- Create trigger on gigs table AFTER INSERT
-- Using AFTER so the row is committed and visible to the webhook
CREATE TRIGGER gig_moderation_webhook_trigger
  AFTER INSERT ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION notify_gig_moderation_webhook();

-- ============================================
-- CONFIGURATION INSTRUCTIONS
-- ============================================
-- Run these in Supabase SQL Editor to configure the webhook:
--
-- ALTER DATABASE postgres SET app.moderation_webhook_url = 'https://claw-jobs.com/api/webhooks/gig-moderation';
-- ALTER DATABASE postgres SET app.webhook_secret = 'your-SUPABASE_WEBHOOK_SECRET-value-here';
--
-- The webhook_secret MUST match the SUPABASE_WEBHOOK_SECRET env var in your app.
-- ============================================

COMMENT ON FUNCTION notify_gig_moderation_webhook() IS 
  'Sends new gig details to moderation webhook for automatic review.
   Configure app.moderation_webhook_url and app.webhook_secret in database settings.
   The webhook_secret must match SUPABASE_WEBHOOK_SECRET in the app environment.';
