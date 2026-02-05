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
  webhook_url TEXT := current_setting('app.moderation_webhook_url', true);
  webhook_secret TEXT := current_setting('app.webhook_secret', true);
  payload JSONB;
BEGIN
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
    
    -- Send async HTTP POST to moderation webhook
    -- Using pg_net for non-blocking HTTP requests
    PERFORM net.http_post(
      url := COALESCE(webhook_url, 'https://claw-jobs.com/api/webhooks/gig-moderation'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', COALESCE(webhook_secret, '')
      ),
      body := payload::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS gig_moderation_webhook_trigger ON gigs;

-- Create trigger on gigs table
CREATE TRIGGER gig_moderation_webhook_trigger
  AFTER INSERT ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION notify_gig_moderation_webhook();

-- Set configuration variables (these should be set in Supabase dashboard > Settings > Database)
-- Or via ALTER DATABASE:
-- ALTER DATABASE postgres SET app.moderation_webhook_url = 'https://claw-jobs.com/api/webhooks/gig-moderation';
-- ALTER DATABASE postgres SET app.webhook_secret = 'your-secret-here';

COMMENT ON FUNCTION notify_gig_moderation_webhook() IS 
  'Sends new gig details to moderation webhook for automatic review. 
   Configure app.moderation_webhook_url and app.webhook_secret in database settings.';
