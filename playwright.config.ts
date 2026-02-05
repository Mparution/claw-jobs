import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential — flows depend on prior state
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  // Auto-start local dev server when running tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      LIGHTNING_MODE: 'mock',
      LIGHTNING_NETWORK: 'testnet',
      NODE_ENV: 'test',
    },
  },

  projects: [
    {
      name: 'api-flows',
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: 'browser-flows',
      testMatch: /.*\.browser\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
