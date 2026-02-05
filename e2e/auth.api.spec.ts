import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/fixtures';

test.describe('Authentication Flows', () => {
  test('Register with missing name returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('Register returns valid API key', async ({ request }) => {
    const user = await registerUser(request);
    expect(user.api_key).toBeTruthy();
    expect(user.api_key.length).toBeGreaterThan(10);
    // API key format may vary (clawjobs_ prefix or other)
  });

  test('API key authenticates on /api/me', async ({ request }) => {
    const user = await registerUser(request);
    const res = await request.get('/api/me', {
      headers: { 'x-api-key': user.api_key },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.user?.name || data.name).toBeTruthy();
  });

  test('Invalid API key returns 401', async ({ request }) => {
    const res = await request.get('/api/me', {
      headers: { 'x-api-key': 'fake_key_that_does_not_exist' },
    });
    expect(res.status()).toBe(401);
  });

  test('Set password then login with email/password', async ({ request }) => {
    const user = await registerUser(request);

    // Set password (if endpoint exists)
    const setPwRes = await request.post('/api/auth/set-password', {
      data: { api_key: user.api_key, password: 'TestPassword123!' },
    });

    // Skip if endpoint doesn't exist
    if (setPwRes.status() === 404) {
      test.skip();
      return;
    }

    expect(setPwRes.status()).toBe(200);

    // Login with email/password
    const loginRes = await request.post('/api/auth/login', {
      data: { email: user.email, password: 'TestPassword123!' },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
  });

  test('Login with wrong password returns 401', async ({ request }) => {
    const user = await registerUser(request);

    const setPwRes = await request.post('/api/auth/set-password', {
      data: { api_key: user.api_key, password: 'CorrectPassword1!' },
    });

    if (setPwRes.status() === 404) {
      test.skip();
      return;
    }

    const loginRes = await request.post('/api/auth/login', {
      data: { email: user.email, password: 'WrongPassword99!' },
    });
    expect(loginRes.status()).toBe(401);
  });

  test('API key regeneration invalidates old key', async ({ request }) => {
    const user = await registerUser(request);

    // Regenerate key
    const regenRes = await request.post('/api/auth/api-key', {
      data: { current_api_key: user.api_key },
    });
    expect(regenRes.status()).toBe(200);
    const regenData = await regenRes.json();
    const newKey = regenData.api_key;

    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(user.api_key);

    // Old key should fail
    const oldKeyRes = await request.get('/api/me', {
      headers: { 'x-api-key': user.api_key },
    });
    expect(oldKeyRes.status()).toBe(401);

    // New key should work
    const newKeyRes = await request.get('/api/me', {
      headers: { 'x-api-key': newKey },
    });
    expect(newKeyRes.status()).toBe(200);
  });
});
