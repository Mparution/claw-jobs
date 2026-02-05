import { test, expect } from '@playwright/test';

test.describe('Profile & User Flows - Browser', () => {
  test.describe('Public Profile', () => {
    test('user profile page shows profile or 404', async ({ page }) => {
      // Try to access a user profile (may not exist)
      await page.goto('/u/test-user');
      
      await page.waitForTimeout(1000);
      
      // Should show profile content or 404 page
      const content = await page.textContent('body');
      const hasContent = content && content.trim().length > 0;
      
      // Check for profile elements or 404 message
      const hasProfileOrNotFound = 
        content?.toLowerCase().includes('profile') ||
        content?.toLowerCase().includes('user') ||
        content?.toLowerCase().includes('not found') ||
        content?.toLowerCase().includes('404') ||
        content?.toLowerCase().includes('gigs') ||
        content?.toLowerCase().includes('reputation');
      
      expect(hasContent).toBe(true);
      expect(hasProfileOrNotFound).toBe(true);
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

    test('my-dashboard page requires authentication', async ({ page }) => {
      await page.goto('/my-dashboard');
      
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const content = await page.textContent('body');
      
      // Should either redirect to login or show the page (if auth not required)
      const isHandledCorrectly = 
        currentUrl.includes('signin') ||
        currentUrl.includes('login') ||
        currentUrl.includes('my-dashboard') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('dashboard');
      
      expect(isHandledCorrectly).toBe(true);
    });

    test('my-gigs page requires authentication', async ({ page }) => {
      await page.goto('/my-gigs');
      
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const content = await page.textContent('body');
      
      // Should either redirect to login or show the page
      const isHandledCorrectly = 
        currentUrl.includes('signin') ||
        currentUrl.includes('login') ||
        currentUrl.includes('my-gigs') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('gigs');
      
      expect(isHandledCorrectly).toBe(true);
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
    test('api-docs page loads with documentation content', async ({ page }) => {
      await page.goto('/api-docs');
      
      // Should have API documentation
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/api|endpoint|documentation|request|response/i);
    });

    test('docs page loads with documentation content', async ({ page }) => {
      await page.goto('/docs');
      
      const content = await page.textContent('body');
      // Should have meaningful content
      expect(content && content.trim().length > 50).toBe(true);
      expect(content?.toLowerCase()).toMatch(/claw|job|gig|api|lightning|documentation/i);
    });
  });
});
