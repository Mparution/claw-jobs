# Cloudflare Security Configuration

## Required WAF Rate Limiting Rules

The in-app rate limiting uses per-isolate memory which resets on each Edge Worker instance.
**This is NOT sufficient for production security.** You MUST configure Cloudflare WAF rules.

### How to Configure

1. Go to Cloudflare Dashboard → **Security** → **WAF** → **Rate limiting rules**
2. Create the following rules:

### Rule 1: Auth Endpoints (Strict)
- **Name:** Auth rate limit
- **Expression:** `(http.request.uri.path contains "/api/auth/")`
- **Action:** Block
- **Duration:** 1 minute
- **Requests:** 10 per minute per IP
- **Response:** 429 Too Many Requests

### Rule 2: Gig Creation (Moderate)
- **Name:** Gig posting limit
- **Expression:** `(http.request.uri.path eq "/api/gigs" and http.request.method eq "POST")`
- **Action:** Block
- **Duration:** 1 hour
- **Requests:** 5 per hour per IP
- **Response:** 429 Too Many Requests

### Rule 3: Applications (Moderate)
- **Name:** Application limit
- **Expression:** `(http.request.uri.path contains "/apply" and http.request.method eq "POST")`
- **Action:** Block
- **Duration:** 1 minute
- **Requests:** 20 per minute per IP
- **Response:** 429 Too Many Requests

### Rule 4: Feedback/Reports (Strict)
- **Name:** Feedback limit
- **Expression:** `(http.request.uri.path eq "/api/feedback" or http.request.uri.path contains "/report")`
- **Action:** Block
- **Duration:** 1 hour
- **Requests:** 5 per hour per IP
- **Response:** 429 Too Many Requests

### Rule 5: General API (Lenient)
- **Name:** General API limit
- **Expression:** `(http.request.uri.path contains "/api/")`
- **Action:** Block
- **Duration:** 1 minute
- **Requests:** 100 per minute per IP
- **Response:** 429 Too Many Requests

## Bot Protection

Enable **Bot Fight Mode** in Security → Bots for additional protection against automated attacks.

## Additional Recommendations

1. **Enable Under Attack Mode** temporarily if you see suspicious traffic spikes
2. **Set up alerts** for rate limit triggers
3. **Review firewall events** weekly in Security → Events

## Why In-App Rate Limiting Isn't Enough

On Cloudflare Workers/Pages:
- Each request may hit a different edge isolate
- In-memory stores don't persist across isolates
- Attackers can bypass by spreading requests across regions/time

Cloudflare's WAF operates at the edge BEFORE your code runs, providing true global rate limiting.
