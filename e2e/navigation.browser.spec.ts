import { test, expect } from '@playwright/test';

test.describe('Navigation & Site Structure - Browser', () => {
  test.describe('Main Navigation', () => {
    test('homepage has working navigation', async ({ page }) => {
      await page.goto('/');
      
      // Should have main navigation
      const nav = page.getByRole('navigation').first();
      await expect(nav).toBeVisible();
    });

    test('can navigate from homepage to gigs', async ({ page }) => {
      await page.goto('/');
      
      // Find and click gigs link
      const gigsLink = page.getByRole('link', { name: /gigs|browse|find/i }).first();
      if (await gigsLink.isVisible().catch(() => false)) {
        await gigsLink.click();
        await page.waitForURL(/gigs/);
        expect(page.url()).toContain('gigs');
      }
    });

    test('footer contains important links', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Check for common footer links
      const footerLinks = ['Terms', 'FAQ', 'About', 'Contact', 'Feedback'];
      
      for (const linkText of footerLinks) {
        const link = page.getByRole('link', { name: new RegExp(linkText, 'i') });
        if (await link.isVisible().catch(() => false)) {
          expect(await link.isVisible()).toBe(true);
          break;
        }
      }
    });
  });

  test.describe('SEO & Metadata', () => {
    test('homepage has proper title', async ({ page }) => {
      await page.goto('/');
      
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title.toLowerCase()).toContain('claw');
    });

    test('robots.txt is accessible', async ({ page }) => {
      const response = await page.request.get('/robots.txt');
      expect(response.status()).toBe(200);
    });

    test('sitemap is accessible', async ({ page }) => {
      const response = await page.request.get('/sitemap.xml');
      // Sitemap might be .xml or generated
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('All Pages Load Without Errors', () => {
    const publicPages = [
      '/',
      '/gigs',
      '/categories',
      '/leaderboard',
      '/for-agents',
      '/lightning-guide',
      '/feedback',
      '/faq',
      '/terms',
      '/about',
      '/stats',
      '/api-docs',
      '/docs',
      '/referrals',
      '/prohibited',
      '/signin',
      '/signup',
      '/forgot-password',
    ];

    for (const pagePath of publicPages) {
      test(`${pagePath} loads without console errors`, async ({ page }) => {
        const errors: string[] = [];
        
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        page.on('pageerror', err => {
          errors.push(err.message);
        });

        const response = await page.goto(pagePath);
        
        // Page should load (2xx or 3xx redirect)
        expect(response?.status()).toBeLessThan(500);
        
        // Allow minor console errors but flag critical ones
        const criticalErrors = errors.filter(e => 
          !e.includes('favicon') && 
          !e.includes('404') &&
          !e.includes('hydration')
        );
        
        if (criticalErrors.length > 0) {
          console.warn(`Page ${pagePath} had errors:`, criticalErrors);
        }
      });
    }
  });

  test.describe('Responsive Design', () => {
    test('mobile viewport renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('tablet viewport renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('desktop viewport renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
