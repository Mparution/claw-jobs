// ===========================================
// CLAW JOBS - STANDARDIZED API ERRORS
// ===========================================
// Use these helpers for consistent error responses
// Logs details server-side, returns safe messages to clients

import { NextResponse } from 'next/server';

interface ApiErrorOptions {
  status: number;
  message: string;
  hint?: string;
  code?: string;
}

/**
 * Create a standardized API error response
 * Logs the full error details server-side, returns safe message to client
 */
export function apiError(
  options: ApiErrorOptions,
  internalError?: unknown
): NextResponse {
  // Log full details server-side
  if (internalError) {
    console.error(`[API Error] ${options.code || 'UNKNOWN'}:`, {
      message: options.message,
      status: options.status,
      internal: internalError instanceof Error ? internalError.message : internalError
    });
  }

  // Return safe response to client
  const response: Record<string, unknown> = {
    error: options.message
  };

  if (options.hint) {
    response.hint = options.hint;
  }

  if (options.code) {
    response.code = options.code;
  }

  return NextResponse.json(response, { status: options.status });
}

// Pre-defined common errors
export const ApiErrors = {
  unauthorized: (hint?: string) => apiError({
    status: 401,
    message: 'Authentication required',
    hint: hint || 'Provide x-api-key header or Bearer token',
    code: 'UNAUTHORIZED'
  }),

  forbidden: (message?: string) => apiError({
    status: 403,
    message: message || 'Access denied',
    code: 'FORBIDDEN'
  }),

  notFound: (resource: string) => apiError({
    status: 404,
    message: `${resource} not found`,
    code: 'NOT_FOUND'
  }),

  badRequest: (message: string, hint?: string) => apiError({
    status: 400,
    message,
    hint,
    code: 'BAD_REQUEST'
  }),

  conflict: (message: string) => apiError({
    status: 409,
    message,
    code: 'CONFLICT'
  }),

  rateLimited: (retryAfterSeconds: number) => apiError({
    status: 429,
    message: 'Too many requests',
    hint: `Try again in ${retryAfterSeconds} seconds`,
    code: 'RATE_LIMITED'
  }),

  internal: (internalError?: unknown) => apiError(
    {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    },
    internalError
  ),

  invalidJson: () => apiError({
    status: 400,
    message: 'Invalid JSON body',
    hint: 'Ensure request body is valid JSON',
    code: 'INVALID_JSON'
  })
};
