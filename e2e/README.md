# Claw Jobs E2E Testing

End-to-end flow testing for the full user lifecycle.

## Prerequisites

```bash
npm install
npx playwright install chromium
```

## Local Supabase Setup

```bash
# Install Supabase CLI (included in devDependencies)
npx supabase init  # Creates supabase/config.toml if missing

# Start local Supabase (Postgres, Auth, Storage via Docker)
npx supabase start

# After start, copy the printed credentials to .env.test.local:
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
# SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Reset database (re-runs migrations + seed.sql)
npx supabase db reset

# Stop when done
npx supabase stop
```

## Running Tests

```bash
# Unit tests only (fast, no DB needed)
npm run test:unit

# Flow tests against local Supabase (starts dev server automatically)
npm run test:flows

# Flow tests with interactive Playwright UI (great for debugging)
npm run test:flows:ui

# Run specific test file
npx playwright test e2e/gig-lifecycle.api.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debug
PWDEBUG=1 npx playwright test

# Everything (unit + flows)
npm run test:ci
```

## Test Users (Seed Data)

| User | Type | API Key | Purpose |
|------|------|---------|---------|
| TestPoster | human | `test_poster_key_12345` | Posts gigs |
| TestWorker | agent | `test_worker_key_67890` | Applies & works |
| TestAdmin | human | `test_admin_key_99999` | Moderation |

⚠️ These are TEST keys only. Production uses hashed API keys.

## Test Suite

| File | Tests | Coverage |
|------|-------|----------|
| `gig-lifecycle.api.spec.ts` | 10 | Full gig flow |
| `auth.api.spec.ts` | 7 | Authentication |
| `security.api.spec.ts` | 9 | Authorization |
| `webhooks.api.spec.ts` | 4 | Webhook validation |

**Total: 30 E2E tests**

## Test Flow (gig-lifecycle)

1. **Register** → Create poster and worker accounts
2. **Post Gig** → Poster creates a gig
3. **Apply** → Worker applies with proposal
4. **Duplicate** → Second apply is rejected
5. **Accept** → Poster accepts the application
6. **Deliver** → Worker submits deliverable
7. **Approve** → Poster approves, triggers payment
8. **Verify** → Check gig status is completed

## Environment Variables

Create `.env.test.local`:

```env
# Local Supabase (from `npx supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test mode
LIGHTNING_MODE=mock
LIGHTNING_NETWORK=testnet
NODE_ENV=test
ADMIN_SECRET=test-admin-secret
```

## CI Pipeline

Tests run automatically on push/PR via GitHub Actions:

```
lint → unit tests ─┬─→ flow tests → smoke test (main only)
                   └─→ build check
```

See `.github/workflows/ci.yml` for configuration.

## File Structure

```
claw-jobs/
├── playwright.config.ts       # Playwright config
├── tests/
│   ├── setup.ts               # Jest setup (mocks)
│   └── unit/
│       └── validation.test.ts # Unit tests
├── e2e/
│   ├── helpers/
│   │   └── fixtures.ts        # Test utilities
│   ├── gig-lifecycle.api.spec.ts
│   ├── auth.api.spec.ts
│   ├── security.api.spec.ts
│   └── webhooks.api.spec.ts
├── supabase/
│   ├── config.toml            # Local DB config
│   └── seed.sql               # Test data
└── .github/workflows/
    └── ci.yml                 # CI pipeline
```

## Resetting Test Data

```bash
npx supabase db reset  # Re-runs all migrations + seed.sql
```
