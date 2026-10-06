import { test, expect } from '@playwright/test';
import { collect, expectHydrated, prerenderedRoutes } from './routes';

/**
 * The hydration crawl (ARCHITECTURE → "SSR and hydration"): every
 * prerendered route, served by `serve-prerendered.mjs` under the production
 * headers, is opened once as Angular and once with `?framework=react`, and
 * must hydrate with a silent console.
 *
 * One page per test so the crawl shards; no axe here — `a11y.spec.ts` owns
 * that.
 */
const ROUTES = prerenderedRoutes();

/** Angular hydration errors / warnings: NG0500–NG0599 plus the prose ones. */
const ANGULAR_HYDRATION = /\bNG0?5\d\d\b|hydrat/i;
/**
 * React hydration failures in a production build arrive as minified errors
 * (#418 text/markup mismatch, #423 recovered by client render, #425 text
 * content, #419/#421/#422 suspense boundaries); the dev builds' prose too.
 */
const REACT_HYDRATION =
  /Minified React error #(41[89]|42[1-5])\b|did not match|Hydration failed|server rendered HTML/i;
/** The production CSP must not block anything the build emits. */
const CSP = /Content Security Policy|Refused to (execute|load|apply)/i;

test.describe('hydration crawl', () => {
  test('the crawl found the prerendered routes', () => {
    expect(ROUTES.length).toBeGreaterThan(100);
  });

  for (const route of ROUTES) {
    for (const framework of ['angular', 'react'] as const) {
      const url = framework === 'react' ? `${route}?framework=react` : route;

      test(`${url} hydrates cleanly`, async ({ page }) => {
        const report = collect(page);
        const response = await page.goto(url);
        expect(response?.status(), url).toBe(200);
        await expectHydrated(page, report);

        const flagged = report.console.filter(
          (line) =>
            ANGULAR_HYDRATION.test(line) ||
            REACT_HYDRATION.test(line) ||
            CSP.test(line),
        );
        expect(flagged, url).toEqual([]);
        expect(report.errors, url).toEqual([]);
      });
    }
  }
});
