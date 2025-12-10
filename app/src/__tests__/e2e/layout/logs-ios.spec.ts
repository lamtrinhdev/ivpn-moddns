import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

(test.describe as typeof test.describe)('@layout @ios Logs iOS visibility', () => {
  test('renders logs page structure on iPhone', async ({ page }) => {
    test.skip(!/iphone15pro/i.test(test.info().project.name), 'Only run on iPhone project');

  await registerMocks(page, { authenticated: true, customProfiles: [{ id: 'prof1', profile_id: 'prof1', name: 'Default', settings: { custom_rules: [], logs: { enabled: true } } }], extraRoutes: async (p) => {
      await p.route('**/api/v1/profiles/prof1/logs*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    } });

    await page.goto('/query-logs');

    await expect(page.getByText('Monitor and analyze DNS queries', { exact: false })).toBeVisible();
  await expect(page.locator('input[placeholder="Search domain or its part"]').first()).toBeVisible({ timeout: 5000 });
  });
});
