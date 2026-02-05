// ===========================================
// CLAW JOBS - ERROR TRACKING
// ===========================================
// Edge-compatible error tracking with Sentry support
// Uses fetch API for edge runtime compatibility

import { logger } from './logger';

interface ErrorContext {
  route?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

// Sentry DSN from environment
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Parse Sentry DSN to get the ingest URL
 */
function parseSentryDSN(dsn: string): { url: string; publicKey: string; projectId: string } | null {
  try {
    // DSN format: https://<public_key>@<host>/<project_id>
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!match) return null;
    
    const [, publicKey, host, projectId] = match;
    return {
      url: `https://${host}/api/${projectId}/envelope/`,
      publicKey,
      projectId
    };
  } catch {
    return null;
  }
}

/**
 * Send error to Sentry using fetch (edge-compatible)
 */
async function sendToSentry(error: Error, context?: ErrorContext): Promise<void> {
  if (!SENTRY_DSN) return;
  
  const parsed = parseSentryDSN(SENTRY_DSN);
  if (!parsed) {
    console.warn('Invalid Sentry DSN format');
    return;
  }

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now() / 1000;

  // Sentry envelope format
  const envelope = [
    // Header
    JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn: SENTRY_DSN
    }),
    // Item header
    JSON.stringify({ type: 'event' }),
    // Event payload
    JSON.stringify({
      event_id: eventId,
      timestamp,
      platform: 'javascript',
      level: 'error',
      logger: 'claw-jobs',
      server_name: 'claw-jobs.com',
      environment: process.env.NODE_ENV || 'production',
      exception: {
        values: [{
          type: error.name || 'Error',
          value: error.message,
          stacktrace: error.stack ? {
            frames: error.stack.split('\n').slice(1).map(line => ({
              filename: line.trim(),
              function: 'unknown'
            })).reverse()
          } : undefined
        }]
      },
      tags: {
        route: context?.route,
        action: context?.action
      },
      extra: context,
      user: context?.userId ? { id: context.userId } : undefined
    })
  ].join('\n');

  try {
    await fetch(parsed.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=claw-jobs/1.0, sentry_key=${parsed.publicKey}`
      },
      body: envelope
    });
  } catch (e) {
    // Don't throw on Sentry errors - just log locally
    console.error('Failed to send to Sentry:', e);
  }
}

/**
 * Report an error to the error tracking service
 * Logs locally and sends to Sentry if configured
 */
export function reportError(error: Error | unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  
  // Always log locally
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    ...context,
  });

  // Send to Sentry (async, don't await)
  sendToSentry(err, context).catch(() => {
    // Silently ignore Sentry failures
  });
}

/**
 * Wrap an async API handler with error reporting
 */
export function withErrorReporting<T>(
  handler: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  return handler().catch((error) => {
    reportError(error, context);
    throw error;
  });
}

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
) {
  return {
    error: message,
    status,
    ...details,
  };
}

export default { reportError, withErrorReporting, apiError };
