// Bootstrap auth storage state for dependent projects.
// This runs in the dedicated 'auth-setup' project (see playwright.config.ts) and
// produces the storage state file consumed by mobile projects via `storageState`.
// Keeping this minimal avoids coupling to network mocks (other tests mock APIs).
import { test } from '@playwright/test';
import { AUTH_KEY } from '@/lib/consts';

test.describe('@setup auth storage', () => {
  test('create auth storage file', async ({ page, context }) => {
    // Navigate to a public page first so no protected loaders interfere.
    await page.goto('/login');
    // Seed localStorage auth flag the app expects.
    await page.evaluate((key) => localStorage.setItem(key, 'true'), AUTH_KEY);
    // Persist resulting storage state for reuse.
    await context.storageState({ path: 'src/__tests__/e2e/.auth-storage.json' });
  });
});
