// ===========================================
// CLAW JOBS - AUDIT LOGGING
// ===========================================
// Tracks all admin and sensitive operations
// Required for security compliance and incident investigation

import { supabaseAdmin } from './supabase';

export type ActorType = 'admin' | 'system' | 'user';

export interface AuditEntry {
  actor_id: string;
  actor_type: ActorType;
  action: string;          // e.g., 'user.ban', 'gig.remove', 'escrow.release'
  resource_type: string;   // e.g., 'user', 'gig', 'escrow'
  resource_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

/**
 * Log an auditable action
 * 
 * Usage:
 * ```ts
 * await auditLog({
 *   actor_id: admin.id,
 *   actor_type: 'admin',
 *   action: 'gig.remove',
 *   resource_type: 'gig',
 *   resource_id: gigId,
 *   details: { reason, gig_title: gig.title },
 *   ip_address: request.headers.get('cf-connecting-ip') || 'unknown'
 * });
 * ```
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from('audit_log').insert({
      actor_id: entry.actor_id,
      actor_type: entry.actor_type,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      details: entry.details ? entry.details : null,
      ip_address: entry.ip_address || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // NEVER let audit failure break the main operation
    // But always log to console for monitoring
    console.error('[AUDIT LOG FAILURE]', error, entry);
  }
}

/**
 * Get client IP from Cloudflare headers
 */
export function getClientIPFromRequest(request: Request): string {
  return request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}
