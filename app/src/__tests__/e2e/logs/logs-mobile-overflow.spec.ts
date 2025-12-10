import { test, expect } from '@playwright/test';
import { registerMocks } from '../../mocks/registerMocks';

// Assumes mobile project config sets viewport (e.g., iPhone) and baseURL.
// Verifies logs page has no horizontal overflow and key containers fit within viewport width.

test.describe('Logs mobile layout', () => {
  test('no horizontal overflow and containers fit', async ({ page }) => {
    await registerMocks(page, {
      authenticated: true,
      customProfiles: [{ id: 'prof1', profile_id: 'prof1', name: 'Default', settings: { logs: { enabled: true } } }],
      extraRoutes: async (p) => {
        // Provide a deterministic set of logs with long domain to challenge layout
        await p.route(/\/api\/v1\/profiles\/prof1\/logs/i, route => {
          const now = new Date().toISOString();
            const items = Array.from({ length: 3 }).map((_, i) => ({
              profile_id: 'prof1',
              timestamp: now,
              status: i === 1 ? 'blocked' : 'processed',
              protocol: 'dns',
              device_id: 'device-mobile-long-id',
              client_ip: '10.0.0.' + i,
              dns_request: { domain: `very-very-long-test-subdomain-${i}.example-reallylongdomainforlayout-validation.test` }
            }));
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) });
        });
      }
    });

  await page.goto('/query-logs');

    // Wait for filters to render
    // Prefer scroll container if logs present, else use empty state container
    const scrollContainer = page.getByTestId('logs-scroll-container');
    const emptyState = page.getByTestId('logs-empty-state');
    // Wait up to 10s for either container to appear
    const appeared = await Promise.race([
      scrollContainer.first().waitFor({ state: 'attached', timeout: 10000 }).then(() => 'scroll').catch(() => null),
      emptyState.first().waitFor({ state: 'attached', timeout: 10000 }).then(() => 'empty').catch(() => null)
    ]);
    expect(appeared, 'Expected logs scroll container or empty state to appear').not.toBeNull();

    // Inject a long domain entry scenario by ensuring at least one log card or fallback appears
    // If no logs present, the empty state should also not overflow horizontally.

    // Evaluate layout metrics in browser context
  const result = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const vw = window.innerWidth;
      const sc = document.querySelector('[data-testid="logs-scroll-container"]') as HTMLElement | null;
      const scrollWidthDoc = Math.max(
        body.scrollWidth,
        docEl.scrollWidth,
        body.offsetWidth,
        docEl.offsetWidth
      );
      const scOverflow = sc ? sc.scrollWidth - sc.clientWidth : 0;
      return { vw, scrollWidthDoc, scOverflow, scClient: sc?.clientWidth, scScroll: sc?.scrollWidth };
    });

    // Assertions: document width should not exceed viewport significantly (allow 1px tolerance)
    expect(result.scrollWidthDoc).toBeLessThanOrEqual(result.vw + 1);
    // Scroll container should not have horizontal overflow
    expect(result.scOverflow).toBeLessThanOrEqual(1);

    // Additionally confirm no body horizontal scrollbar via CSS overflow values
    const hasHorizontalScrollbar = await page.evaluate(() => {
      return window.innerHeight < document.documentElement.clientHeight || document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScrollbar).toBeFalsy();
  });
});
