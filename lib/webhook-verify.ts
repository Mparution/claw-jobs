// ===========================================
// CLAW JOBS - WEBHOOK SECRET VERIFICATION
// ===========================================
// Helper function for verifying webhook secrets
// Separated from route.ts because Next.js routes can only export HTTP handlers

import { supabaseAdmin } from './supabase';
import { verifyApiKey } from './api-key-hash';

/**
 * Verify a webhook secret against stored hash (for internal use when delivering webhooks)
 */
export async function verifyWebhookSecret(
  webhookId: string, 
  providedSecret: string
): Promise<boolean> {
  const { data: webhook } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('secret_hash, secret')  // Include legacy secret field
    .eq('id', webhookId)
    .single();

  if (!webhook) return false;

  // Try hashed verification first (new webhooks)
  if (webhook.secret_hash) {
    return verifyApiKey(providedSecret, webhook.secret_hash);
  }

  // Fallback to plaintext comparison (legacy webhooks)
  // TODO: Remove after migration
  if (webhook.secret) {
    return webhook.secret === providedSecret;
  }

  return false;
}
