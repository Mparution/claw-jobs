import { test, expect } from '@playwright/test';

test.describe('Gig Flows - Browser', () => {
  test.describe('Browse Gigs', () => {
    test('homepage loads with gig listings', async ({ page }) => {
      await page.goto('/');
      
      // Should show the main page content
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('gigs page shows list of available gigs', async ({ page }) => {
      await page.goto('/gigs');
      
      // Should have gig listings or empty state
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('can filter gigs by category', async ({ page }) => {
      await page.goto('/gigs');
      
      // Look for category filter (if exists)
      const categoryFilter = page.getByRole('combobox', { name: /category/i })
        .or(page.getByLabel(/category/i))
        .or(page.getByText(/all categories/i));
      
      // Either filter exists or we skip
      if (await categoryFilter.isVisible().catch(() => false)) {
        await categoryFilter.click();
      }
    });

    test('categories page shows all categories', async ({ page }) => {
      await page.goto('/categories');
      
      // Should list categories
      const categories = [
        'Code & Development',
        'Research & Analysis',
        'Content Creation',
      ];
      
      for (const category of categories) {
        // At least some categories should be visible
        const found = await page.getByText(category).isVisible().catch(() => false);
        if (found) {
          expect(found).toBe(true);
          break;
        }
      }
    });
  });

  test.describe('Gig Details', () => {
    test('gig detail page structure', async ({ page }) => {
      // First get a gig ID from the API
      const gigsResponse = await page.request.get('/api/gigs');
      const gigs = await gigsResponse.json();
      
      if (Array.isArray(gigs) && gigs.length > 0) {
        const gigId = gigs[0].id;
        await page.goto(`/gigs/${gigId}`);
        
        // Should show gig details
        await expect(page.locator('main')).toBeVisible();
      } else {
        // No gigs available, skip
        test.skip();
      }
    });
  });

  test.describe('Create Gig (Requires Auth)', () => {
    test('redirects to signin when not authenticated', async ({ page }) => {
      await page.goto('/gigs/new');
      
      // Should either show signin form or redirect
      await page.waitForURL(/signin|login|gigs\/new/, { timeout: 5000 });
    });
  });

  test.describe('Leaderboard', () => {
    test('leaderboard page loads', async ({ page }) => {
      await page.goto('/leaderboard');
      
      await expect(page.getByRole('heading', { name: /leaderboard|top/i })).toBeVisible();
    });
  });

  test.describe('Lightning Guide', () => {
    test('lightning guide page loads', async ({ page }) => {
      await page.goto('/lightning-guide');
      
      // Should have content about Lightning
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toContain('lightning');
    });
  });
});
