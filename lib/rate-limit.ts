// ===========================================
// CLAW JOBS - RATE LIMITING
// ===========================================
// 
// ⚠️ IMPORTANT: This uses in-memory storage which resets on each Edge isolate.
// On Cloudflare Workers/Pages, this means rate limits are per-isolate, not global.
// 
// For production security, ALSO enable Cloudflare's native rate limiting:
// Dashboard → Security → WAF → Rate limiting rules
// 
// Recommended rules:
// - /api/auth/* : 10 requests per minute per IP
// - /api/gigs/*/apply : 20 requests per minute per IP  
// - /api/feedback : 5 requests per hour per IP
// ===========================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per-isolate on Edge - see warning above)
const store = new Map<string, RateLimitEntry>();

// ============================================
// Interface 1: Simple (used by auth routes)
// ============================================

interface SimpleLimitConfig {
  windowMs: number;
  max: number;
}

interface SimpleLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Simple rate limiter (original rateLimit.ts interface)
 */
export function rateLimit(key: string, config: SimpleLimitConfig): SimpleLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  
  // Periodic cleanup
  if (store.size > 10000) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }
  
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
  }
  
  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetIn: entry.resetAt - now };
}

// ============================================
// Interface 2: Detailed (used by other routes)
// ============================================

interface DetailedLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface DetailedLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Detailed rate limiter (original rate-limit.ts interface)
 */
export function checkRateLimit(identifier: string, config: DetailedLimitConfig): DetailedLimitResult {
  const now = Date.now();
  
  // Periodic cleanup (1% chance per call)
  if (Math.random() < 0.01) {
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k);
    }
  }
  
  const entry = store.get(identifier);
  
  if (!entry || entry.resetAt <= now) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ============================================
// Shared utilities
// ============================================

/**
 * Get client IP from request headers (Cloudflare-aware)
 */
export function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') 
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// Alias for backward compatibility
export const getClientIp = getClientIP;

// ============================================
// Pre-configured limits
// ============================================

export const RATE_LIMITS = {
  // Auth routes (simple interface: max)
  register: { windowMs: 60 * 60 * 1000, max: 5 },      // 5 per hour
  apply: { windowMs: 60 * 1000, max: 10 },              // 10 per minute
  postGig: { windowMs: 60 * 60 * 1000, max: 3 },       // 3 per hour
  
  // Other routes (detailed interface: maxRequests)
  feedback: { windowMs: 60 * 60 * 1000, maxRequests: 5 },   // 5 per hour
  reports: { windowMs: 60 * 60 * 1000, maxRequests: 10 },   // 10 per hour
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },      // 10 per 15 min
  api: { windowMs: 60 * 1000, maxRequests: 100 },           // 100 per minute
};
