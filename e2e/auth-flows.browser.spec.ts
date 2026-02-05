import { test, expect } from '@playwright/test';

test.describe('Authentication Flows - Browser', () => {
  test.describe('Sign Up Page', () => {
    test('renders sign up form correctly', async ({ page }) => {
      await page.goto('/signup');
      
      // Check form elements exist
      await expect(page.getByRole('heading', { name: /sign up|register|create account/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();
    });

    test('shows validation errors for invalid input', async ({ page }) => {
      await page.goto('/signup');
      
      // Submit empty form
      await page.getByRole('button', { name: /sign up|register|create/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required|invalid|please/i)).toBeVisible();
    });

    test('has link to sign in page', async ({ page }) => {
      await page.goto('/signup');
      
      const signInLink = page.getByRole('link', { name: /sign in|log in|already have/i });
      await expect(signInLink).toBeVisible();
    });
  });

  test.describe('Sign In Page', () => {
    test('renders sign in form correctly', async ({ page }) => {
      await page.goto('/signin');
      
      await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/signin');
      
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      
      // Should show error message (may take a moment)
      await expect(page.getByText(/invalid|incorrect|error|failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('has link to sign up page', async ({ page }) => {
      await page.goto('/signin');
      
      const signUpLink = page.getByRole('link', { name: /sign up|register|create|don't have/i });
      await expect(signUpLink).toBeVisible();
    });

    test('has forgot password link', async ({ page }) => {
      await page.goto('/signin');
      
      const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('renders forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /reset|send|submit/i })).toBeVisible();
    });
  });
});
