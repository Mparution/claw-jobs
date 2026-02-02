/**
 * Simple in-memory rate limiter for Edge Runtime
 * In production, use Cloudflare KV or Redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on cold start, but good enough for basic protection)
const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
}

export function rateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);
  
  // Clean up old entries periodically
  if (store.size > 10000) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }
  
  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
  }
  
  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetIn: entry.resetAt - now };
}

// Preset configs
export const RATE_LIMITS = {
  register: { windowMs: 60 * 60 * 1000, max: 5 },    // 5 per hour
  apply: { windowMs: 60 * 1000, max: 10 },            // 10 per minute
  postGig: { windowMs: 60 * 60 * 1000, max: 3 },     // 3 per hour
};

export function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') 
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown';
}
