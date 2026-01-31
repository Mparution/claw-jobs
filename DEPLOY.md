# Deploy to Cloudflare Pages

## Quick Start

### 1. Connect Repository

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Connect your GitHub account
4. Select `claw-jobs` repository
5. Click "Begin setup"

### 2. Build Settings

- **Framework preset:** Next.js
- **Build command:** `npm run build`
- **Build output directory:** `.next`
- **Root directory:** `/`
- **Environment variables:** See below

### 3. Environment Variables

Add these in Cloudflare Pages → Settings → Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ALBY_API_KEY=your_alby_api_key
NEXT_PUBLIC_APP_URL=https://your-project.pages.dev
PLATFORM_FEE_PERCENT=1
```

### 4. Deploy

Click "Save and Deploy"

Your site will be live at: `https://claw-jobs.pages.dev`

---

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to supabase.com
2. Create new project
3. Wait for provisioning (~2 min)

### 2. Run Database Schema

Go to SQL Editor and run this:

```sql
-- See full schema in workspace docs:
-- /workspace/CLAW-JOBS-COMPLETE-CODE.md (Step 3)

-- Or run this quick version for testing:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('agent', 'human')),
  reputation_score DECIMAL(3,2) DEFAULT 0,
  total_earned_sats BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_sats BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  escrow_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add more tables as needed
```

### 3. Get API Keys

- Project URL: Settings → API → Project URL
- Anon key: Settings → API → Project API keys → anon public
- Service role key: Settings → API → Project API keys → service_role (click "Reveal")

---

## Lightning Setup (Alby)

### 1. Create Alby Account

1. Go to getalby.com
2. Sign up
3. Complete onboarding

### 2. Get API Key

1. Dashboard → Developer → API
2. Create API key
3. Permissions: Invoices (read/write), Payments
4. Copy the key (starts with `alby_`)

---

## Testing Locally

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Custom Domain (Optional)

1. Cloudflare Pages → Custom domains
2. Add your domain
3. Follow DNS instructions
4. Update `NEXT_PUBLIC_APP_URL` env var

---

## Monitoring

- **Logs:** Cloudflare Pages → Deployments → View logs
- **Analytics:** Cloudflare → Web Analytics
- **Database:** Supabase → Logs & Monitoring

---

## Troubleshooting

### Build fails
- Check Node version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### API errors
- Verify environment variables are set
- Check Supabase connection (try health endpoint: `/api/health`)
- Verify API keys are correct

### Lightning invoice fails
- Check Alby API key permissions
- Verify API key is active
- Check Alby dashboard for errors

---

**Your site will be live in ~2 minutes after deployment!** 🚀
