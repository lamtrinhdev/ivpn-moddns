import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

const routes = ['/login','/signup','/reset-password','/tos','/privacy'];

for (const route of routes) {
  test.describe(`@layout Public layout ${route}`, () => {
    test.beforeEach(async ({ page }) => {
  await registerMocks(page, { authenticated: false });
      await page.goto(route);
      await page.waitForSelector('[data-testid="public-layout"]', { state: 'attached', timeout: 5000 });
    });

    test('no horizontal overflow & starts at left edge', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const layout = document.querySelector('[data-testid="public-layout"]') as HTMLElement | null;
        const rect = layout ? layout.getBoundingClientRect() : null;
        return {
          hasOverflow: doc.scrollWidth > doc.clientWidth + 1,
          left: rect?.left ?? null,
          right: rect?.right ?? null,
          vw: doc.clientWidth
        };
      });
      expect(metrics.hasOverflow, 'No horizontal overflow expected').toBeFalsy();
      expect(metrics.left, 'Public layout should start at left edge').toBe(0);
      if (metrics.right !== null) {
        expect(Math.abs(metrics.vw - metrics.right)).toBeLessThanOrEqual(1);
      }
    });
  });
}
