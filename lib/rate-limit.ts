// ===========================================
// CLAW JOBS - RATE LIMITING
// ===========================================

// In-memory rate limit store (resets on redeploy)
// For production, consider using Redis or Cloudflare KV
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt <= now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt
    };
  }
  
  // Increment counter
  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Cloudflare
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  
  // Standard forwarded header
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  return 'unknown';
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  // Feedback: 5 per hour per IP
  feedback: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  
  // Reports: 10 per hour per IP
  reports: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  
  // Auth attempts: 10 per 15 minutes per IP
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  
  // API calls: 100 per minute per IP
  api: { windowMs: 60 * 1000, maxRequests: 100 },
};
