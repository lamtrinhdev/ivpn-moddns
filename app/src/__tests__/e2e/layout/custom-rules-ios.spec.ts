import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

(test.describe as typeof test.describe)('@layout @ios Custom Rules iOS visibility', () => {
  test('content renders on iOS', async ({ page }) => {
    test.skip(!/iphone15pro/i.test(test.info().project.name), 'Only relevant for iPhone viewport projects');

  await registerMocks(page, { authenticated: true, customProfiles: [{ id: 'prof1', profile_id: 'prof1', name: 'Default', settings: { custom_rules: [] } }] });

    await page.goto('/custom-rules');

    await expect(page.getByText('Manually add domains', { exact: false })).toBeVisible();
    await expect(page.getByRole('tab', { name: /denylist/i })).toBeVisible();
  });
});
