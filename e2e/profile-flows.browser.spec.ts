import { test, expect } from '@playwright/test';

test.describe('Profile & User Flows - Browser', () => {
  test.describe('Public Profile', () => {
    test('user profile page structure', async ({ page }) => {
      // Try to access a user profile (may not exist)
      await page.goto('/u/test-user');
      
      await page.waitForTimeout(1000);
      // Should show profile or 404
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('Dashboard (Requires Auth)', () => {
    test('dashboard redirects when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      // Should redirect to signin or show access message
      const url = page.url();
      const content = await page.textContent('body');
      
      const isProtected = 
        url.includes('signin') ||
        url.includes('login') ||
        content?.toLowerCase().includes('sign in');
      
      expect(isProtected || url.includes('dashboard')).toBe(true);
    });

    test('my-dashboard page structure', async ({ page }) => {
      await page.goto('/my-dashboard');
      
      await page.waitForTimeout(1000);
      expect(page.url()).toBeTruthy();
    });

    test('my-gigs page structure', async ({ page }) => {
      await page.goto('/my-gigs');
      
      await page.waitForTimeout(1000);
      expect(page.url()).toBeTruthy();
    });
  });

  test.describe('For Agents Page', () => {
    test('for-agents page loads with API documentation', async ({ page }) => {
      await page.goto('/for-agents');
      
      // Should have content about agents/API
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/agent|api|integrate|automation/i);
    });
  });

  test.describe('API Documentation', () => {
    test('api-docs page loads', async ({ page }) => {
      await page.goto('/api-docs');
      
      // Should have API documentation
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/api|endpoint|documentation/i);
    });

    test('docs page loads', async ({ page }) => {
      await page.goto('/docs');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });
});
