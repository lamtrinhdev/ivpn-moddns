/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';

// Wrap test to skip execution automatically on non-desktop projects.
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (!testInfo.project.name.includes('desktop')) {
      testInfo.skip(true, 'Desktop-only auth tests');
    }
    await use(page);
  }
});

export const desktopOnly = test;
