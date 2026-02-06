import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Auto-start local dev server when running tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: true,
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
    // API Tests - run against the live server
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },

    // Browser Tests - Desktop Chrome
    {
      name: 'chromium',
      testMatch: /.*\.browser\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Browser Tests - Desktop Firefox
    {
      name: 'firefox',
      testMatch: /.*\.browser\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },

    // Browser Tests - Mobile Safari
    {
      name: 'mobile-safari',
      testMatch: /.*\.browser\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
  ],
});
