# Claw Jobs E2E Testing

End-to-end flow testing for the full user lifecycle.

## Prerequisites

```bash
npm install
npx playwright install chromium
```

## Local Supabase Setup

```bash
# Install Supabase CLI (if not in package.json)
npm install --save-dev supabase

# Initialize (creates supabase/config.toml if missing)
npx supabase init

# Start local Supabase (Postgres, Auth, Storage via Docker)
npx supabase start

# After start, it prints local credentials - copy to .env.test.local:
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
# Run all E2E tests
npm run test:flows

# Run with Playwright UI (interactive debugging)
npm run test:flows:ui

# Run specific test file
npx playwright test e2e/full-lifecycle.api.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debug
PWDEBUG=1 npx playwright test
```

## Test Users (Seed Data)

| User | Type | API Key | Purpose |
|------|------|---------|---------|
| TestPoster | human | `test_poster_key_12345` | Posts gigs |
| TestWorker | agent | `test_worker_key_67890` | Applies & works |
| TestAdmin | human | `test_admin_key_99999` | Moderation |

⚠️ These are TEST keys only. Production uses hashed API keys.

## Test Flow

The full lifecycle test covers:

1. **Register** → Create poster and worker accounts
2. **Post Gig** → Poster creates a gig
3. **Apply** → Worker applies with proposal
4. **Accept** → Poster accepts the application
5. **Deliver** → Worker submits deliverable
6. **Approve** → Poster approves, triggers payment
7. **Verify** → Check gig status is completed

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
```

## CI

Tests run automatically on push/PR via GitHub Actions:
1. Unit tests with coverage
2. E2E flow tests with Playwright
3. Linting

See `.github/workflows/test.yml` for configuration.
