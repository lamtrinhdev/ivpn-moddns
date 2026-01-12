import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

const ROUTE = '/home';
const WIDTH_COLLAPSED = { width: 1280, height: 900 }; // navDesktop true, should stay collapsed
const WIDTH_EXPANDED = { width: 1440, height: 900 }; // beyond expand threshold

async function getNavWidth(page) {
  const nav = page.locator('[data-testid="main-navigation"]');
  await expect(nav).toBeVisible({ timeout: 5000 });
  const box = await nav.boundingBox();
  if (!box) throw new Error('Navigation bounding box not available');
  return box.width;
}

test.describe('@layout sidebar hysteresis', () => {
  test.beforeEach(async ({ page }) => {
    if (!/desktop/i.test(test.info().project.name)) test.skip();
    await registerMocks(page, { authenticated: true, customProfiles: [{ id: 'prof_1', name: 'Default' }] });
  });

  test('collapses at 1280 and expands at 1440', async ({ page }) => {
    await page.setViewportSize(WIDTH_COLLAPSED);
    await page.goto(ROUTE);
    await expect.poll(async () => await getNavWidth(page), { timeout: 800 }).toBeLessThanOrEqual(80);

    await page.setViewportSize(WIDTH_EXPANDED);
    await expect.poll(async () => await getNavWidth(page), { timeout: 800 }).toBeGreaterThanOrEqual(200);
  });
});
