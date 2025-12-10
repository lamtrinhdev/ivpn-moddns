import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

(test.describe as typeof test.describe)('@layout @ios Setup iOS visibility', () => {
  test('renders setup page content on iPhone', async ({ page }) => {
    test.skip(!/iphone15pro/i.test(test.info().project.name), 'Only run on iPhone project');

  await registerMocks(page, { authenticated: true, customProfiles: [{ id: 'prof1', profile_id: 'prof1', name: 'Default', settings: { custom_rules: [] } }] });

    await page.goto('/setup');

    await expect(page.getByRole('heading', { name: 'Setup' })).toBeVisible();
    await expect(page.getByText('Use the account-specific information', { exact: false })).toBeVisible();
    await expect(page.getByTestId('setup-platform-card-windows')).toBeVisible();
  });
});
