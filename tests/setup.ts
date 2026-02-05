import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
vi.stubEnv('LIGHTNING_MODE', 'mock');
vi.stubEnv('LIGHTNING_NETWORK', 'testnet');

// Mock fetch for tests that need it
global.fetch = vi.fn();

// Mock console.error to catch React warnings
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress specific React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: An update to'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
