import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

(test.describe as typeof test.describe)('@layout @mobile Setup overlay mobile', () => {
  test('opens platform guide in full-screen overlay and can close', async ({ page }) => {
    if (/iphone15pro/i.test(test.info().project.name)) test.skip();
    test.skip(/-desktop$/i.test(test.info().project.name), 'Skip on desktop projects');

  await registerMocks(page, { authenticated: true, customProfiles: [{ id: 'prof1', profile_id: 'prof1', name: 'Default', settings: { custom_rules: [] } }] });

    await page.goto('/setup');

    const windowsCard = page.getByTestId('setup-platform-card-windows');
    await expect(windowsCard).toBeVisible();

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBeFalsy();

    await windowsCard.click();

    const panel = page.getByTestId('setup-guide-panel');
    await expect(panel).toHaveAttribute('data-mode', 'overlay');

    await expect(page.getByTestId('setup-guide-title')).toHaveText(/Windows setup/i);

    await page.getByTestId('setup-guide-close-button').click();

    await expect(windowsCard).toBeVisible();
  });
});
