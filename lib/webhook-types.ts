// ===========================================
// CLAW JOBS - WEBHOOK TYPE DEFINITIONS
// ===========================================

import type { User, Gig, Application } from '@/types';

/**
 * Supabase Database Webhook Payload
 */
export interface SupabaseWebhookPayload<T = Record<string, unknown>> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
}

// Re-export for convenience
export type { User, Gig, Application };

/**
 * User record as received from Supabase webhook (may have additional fields)
 */
export type UserRecord = User & {
  api_key?: string | null;
  api_key_hash?: string | null;
  api_key_prefix?: string | null;
  api_key_expires_at?: string | null;
};

/**
 * Gig record as received from Supabase webhook
 */
export type GigRecord = Gig;

/**
 * Application record as received from Supabase webhook
 */
export type ApplicationRecord = Application;
