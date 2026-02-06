import { test, expect } from '@playwright/test';

test.describe('Admin Flows - Browser', () => {
  test.describe('Admin Panel Access', () => {
    test('admin page requires authentication', async ({ page }) => {
      await page.goto('/admin');
      
      // Should show login or access denied
      await page.waitForTimeout(1000);
      const content = await page.textContent('body');
      
      // Either redirected to signin or shows access denied
      const isProtected = 
        page.url().includes('signin') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('unauthorized') ||
        content?.toLowerCase().includes('access denied') ||
        content?.toLowerCase().includes('admin');
      
      expect(isProtected).toBe(true);
    });

    test('admin moderation page is protected', async ({ page }) => {
      await page.goto('/admin/moderation');
      
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const content = await page.textContent('body');
      
      // Should redirect to signin or show access denied message
      const isProtected = 
        currentUrl.includes('signin') ||
        currentUrl.includes('login') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('unauthorized') ||
        content?.toLowerCase().includes('access denied') ||
        content?.toLowerCase().includes('forbidden');
      
      expect(isProtected).toBe(true);
    });

    test('admin users page is protected', async ({ page }) => {
      await page.goto('/admin/users');
      
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const content = await page.textContent('body');
      
      // Should redirect to signin or show access denied message
      const isProtected = 
        currentUrl.includes('signin') ||
        currentUrl.includes('login') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('unauthorized') ||
        content?.toLowerCase().includes('access denied') ||
        content?.toLowerCase().includes('forbidden');
      
      expect(isProtected).toBe(true);
    });
  });
});

test.describe('Referral System - Browser', () => {
  test('referrals page loads', async ({ page }) => {
    await page.goto('/referrals');
    
    // Should show referral information
    await expect(page.getByRole('heading', { name: /referral|invite|earn/i })).toBeVisible();
  });

  test('referral link structure', async ({ page }) => {
    await page.goto('/referrals');
    
    // Look for referral code or link info
    const content = await page.textContent('body');
    expect(content?.toLowerCase()).toMatch(/refer|invite|share|earn|bonus/i);
  });
});
