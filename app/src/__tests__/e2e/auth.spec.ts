// moved from src/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean auth state each test
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
    });
  });

  test('redirects unauthenticated user to /login when visiting protected route', async ({ page }) => {
    await page.goto('/home');
    // Wait for potential client redirect logic
    await page.waitForLoadState('networkidle');
    // Accept either immediate redirect or soft navigation via router push
    await expect.poll(async () => page.url()).toMatch(/\/login$/);
  });

  test('login page renders without console errors (mobile)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    // Prefer testid vs dynamic button text
    const toggle = page.getByTestId('btn-login-toggle-mode');
    await expect(toggle).toBeVisible();
    // Ensure both forms can be toggled without errors
    await toggle.click(); // switch mode
    await expect(page.getByTestId(/login-(passkey|password)-form/)).toBeVisible();
    expect(errors).toEqual([]);
  });
});
