import { test, expect } from '@playwright/test';

/**
 * The prerendered HTML must fit a phone **before** hydration — the first
 * paint a reader sees. `visual-states.spec.ts` checks phone width on the
 * running app; this one turns JavaScript off, so the server markup is
 * measured with nothing (deferred blocks, hydration, client-only layout)
 * having replaced it yet. The deferred header selects' placeholders once
 * widened every page by 214px here until hydration swapped them out.
 *
 * The routes are the recently added component pages (W8a–W8e) plus a few
 * long-standing ones; React pages are prerendered under `?framework=react`
 * from the same HTML, so the Angular render stands for the shell of both.
 */
const ROUTES = [
  '/components/inputs/date-box',
  '/components/avatar',
  '/components/chip',
  '/components/alert',
  '/components/timeline',
  '/components/app-bar',
  '/components/buttons/fab',
  '/components/inputs/rating',
  '/components/inputs/otp-input',
  '/components/inputs/signature-pad',
  '/components/inputs/list-box',
  '/components/inputs/transfer-list',
  '/components/inputs/mention',
  '/components/charts',
  '/components/charts/gauges',
  '/components/charts/specialized',
  '/components/carousel',
  '/components/overlay/action-sheet',
  '/components/list-view',
  '/components/data-view',
  '/components/tile-layout',
  '/components/editor',
];

test.describe('phone width, server HTML (no JavaScript)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    locale: 'en-US',
  });

  for (const route of ROUTES) {
    test(`${route} does not scroll sideways before hydration`, async ({
      page,
    }) => {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('app-demo-card').first()).toBeVisible();
      // no script runs, so the layout is final once the page has loaded
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, route).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('narrowest phone width (320px), server HTML header', () => {
  test.use({
    viewport: { width: 320, height: 640 },
    javaScriptEnabled: false,
    locale: 'en-US',
  });

  for (const route of [
    '/components/tabs',
    '/components/inputs/list-box',
    '/',
  ]) {
    test(`${route}: the header fits before hydration`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      const overflow = await header.evaluate((el) => {
        const row = el.firstElementChild as HTMLElement;
        const right = Math.max(
          ...Array.from(row.querySelectorAll<HTMLElement>('*'))
            .filter((child) => child.getClientRects().length > 0)
            .map((child) => child.getBoundingClientRect().right),
        );
        return Math.max(
          row.scrollWidth - row.clientWidth,
          right - window.innerWidth,
        );
      });
      expect(overflow, route).toBeLessThanOrEqual(0);
    });
  }
});
