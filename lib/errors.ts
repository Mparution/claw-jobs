// ===========================================
// CLAW JOBS - ERROR TRACKING
// ===========================================
// Central error handling and reporting
// Ready to integrate with Sentry, LogRocket, etc.

import { logger } from './logger';

interface ErrorContext {
  route?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * Report an error to the error tracking service
 * Currently logs to console - can be extended for Sentry, etc.
 */
export function reportError(error: Error | unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    ...context,
  });

  // TODO: Add Sentry integration
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(err, { extra: context });
  // }
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
