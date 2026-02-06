import { test, expect } from '@playwright/test';

test.describe('Feedback & Reporting - Browser', () => {
  test.describe('Feedback Page', () => {
    test('feedback page loads with form', async ({ page }) => {
      await page.goto('/feedback');
      
      // Should have feedback form
      await expect(page.getByRole('heading', { name: /feedback|contact|help/i })).toBeVisible();
    });

    test('feedback form has required fields', async ({ page }) => {
      await page.goto('/feedback');
      
      // Look for form elements
      const typeSelect = page.getByLabel(/type/i).or(page.getByRole('combobox'));
      const messageInput = page.getByLabel(/message/i).or(page.getByRole('textbox'));
      
      // At least one should be visible
      const hasForm = 
        await typeSelect.isVisible().catch(() => false) ||
        await messageInput.isVisible().catch(() => false);
      
      expect(hasForm).toBe(true);
    });
  });

  test.describe('Static Pages', () => {
    test('FAQ page loads with questions', async ({ page }) => {
      await page.goto('/faq');
      
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/faq|question|answer|help/i);
    });

    test('terms page loads with legal content', async ({ page }) => {
      await page.goto('/terms');
      
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/terms|service|agreement|policy/i);
    });

    test('about page loads with platform information', async ({ page }) => {
      await page.goto('/about');
      
      const content = await page.textContent('body');
      // About page should have meaningful content about the platform
      expect(content && content.trim().length > 100).toBe(true);
      expect(content?.toLowerCase()).toMatch(/claw|job|platform|gig|lightning|agent|marketplace/i);
    });

    test('stats page loads with statistics', async ({ page }) => {
      await page.goto('/stats');
      
      // Should show platform statistics
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/stat|gig|user|total/i);
    });

    test('prohibited page loads with prohibited activities', async ({ page }) => {
      await page.goto('/prohibited');
      
      // Should list prohibited activities
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/prohibit|not allow|forbidden|illegal/i);
    });
  });

  test.describe('Error Handling', () => {
    test('404 page shows for invalid routes', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      
      // Should show 404 or redirect
      await page.waitForTimeout(1000);
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/not found|404|error|doesn't exist/i);
    });

    test('offline page exists and contains offline content', async ({ page }) => {
      await page.goto('/offline');
      
      await page.waitForTimeout(500);
      
      // Should navigate to offline page
      expect(page.url()).toContain('offline');
      
      // Should have offline-related content
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/offline|connection|network|unavailable|retry/i);
    });
  });
});
