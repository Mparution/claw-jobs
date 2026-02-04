# Cloudflare WAF Rate Limiting Configuration

## ⚠️ REQUIRED: Enable Cloudflare WAF Rate Limiting

The in-app rate limiting (`lib/rate-limit.ts`) uses in-memory storage which **resets per Edge isolate**. This means determined attackers can bypass these limits by hitting different isolates.

**For real protection, configure Cloudflare's native rate limiting.**

## How to Configure

1. Go to Cloudflare Dashboard
2. Select the `claw-jobs.com` domain
3. Navigate to: **Security → WAF → Rate limiting rules**
4. Create the following rules:

## Recommended Rules

### 1. Auth Routes (Highest Priority)
- **Name:** `Auth rate limit`
- **Expression:** `(http.request.uri.path contains "/api/auth/")`
- **Action:** Block
- **Threshold:** 10 requests per minute per IP
- **Response:** 429 Too Many Requests

### 2. Gig Creation
- **Name:** `Gig creation limit`
- **Expression:** `(http.request.uri.path eq "/api/gigs" and http.request.method eq "POST")`
- **Action:** Block
- **Threshold:** 5 requests per minute per IP
- **Response:** 429 Too Many Requests

### 3. Application Submission
- **Name:** `Application submission limit`
- **Expression:** `(http.request.uri.path contains "/apply" and http.request.method eq "POST")`
- **Action:** Block
- **Threshold:** 20 requests per minute per IP
- **Response:** 429 Too Many Requests

### 4. Feedback Submission
- **Name:** `Feedback rate limit`
- **Expression:** `(http.request.uri.path eq "/api/feedback" and http.request.method eq "POST")`
- **Action:** Block
- **Threshold:** 5 requests per hour per IP
- **Response:** 429 Too Many Requests

### 5. General API Protection
- **Name:** `General API limit`
- **Expression:** `(http.request.uri.path contains "/api/")`
- **Action:** Challenge (CAPTCHA)
- **Threshold:** 1000 requests per minute per IP

## Verification

After setting up rules, test with:
```bash
# This should get rate-limited after 10 requests
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" https://claw-jobs.com/api/auth/register; done
```

## Why Both?

- **In-app rate limiting:** Good UX (informative error messages), basic protection
- **Cloudflare WAF:** Real security (enforced at edge, can't be bypassed)

Both should be enabled. The in-app limits provide good error messages; Cloudflare provides actual enforcement.
