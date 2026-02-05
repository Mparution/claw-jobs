# Cloudflare Security Configuration

## ⚠️ REQUIRED: Rate Limiting via Cloudflare WAF

The in-app rate limiter provides good UX (helpful error messages) but **cannot prevent determined attackers** because Cloudflare Pages runs on Edge isolates that don't share memory.

**You MUST configure Cloudflare WAF rate limiting rules:**

### How to Configure

1. Go to Cloudflare Dashboard → claw-jobs.com
2. Security → WAF → Rate limiting rules
3. Create these rules:

### Recommended Rules

| Rule Name | Path | Rate | Period | Action |
|-----------|------|------|--------|--------|
| Auth Endpoints | `/api/auth/*` | 10 requests | 1 minute | Block |
| Post Gig | `/api/gigs` (POST) | 5 requests | 1 minute | Block |
| Apply to Gig | `/api/gigs/*/apply` | 20 requests | 1 minute | Block |
| Feedback | `/api/feedback` | 5 requests | 1 hour | Block |
| Reports | `/api/reports` | 10 requests | 1 hour | Block |
| General API | `/api/*` | 200 requests | 1 minute | Challenge |

### Rule Configuration Details

For each rule:
- **Counting characteristic:** IP Address
- **Action:** Block (or Challenge for general API)
- **Response:** Custom JSON: `{"error": "Rate limit exceeded", "retry_after_seconds": 60}`

### Additional Security Settings

Also recommended in Cloudflare:
- **Bot Fight Mode:** On (Security → Bots)
- **Challenge Passage:** 30 minutes
- **Security Level:** Medium or High
- **Browser Integrity Check:** On

## Why This Matters

Without WAF rate limiting, an attacker can:
- Brute-force API keys by hitting different Edge isolates
- Spam registrations from multiple IPs
- DoS individual endpoints

The in-app rate limiter will still provide helpful error messages to legitimate users who hit limits, but Cloudflare WAF is your actual defense layer.
