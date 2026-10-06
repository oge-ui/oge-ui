import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';

const WORKSPACE = resolve(__dirname, '../../..');
const DIST = join(WORKSPACE, 'dist/apps/dev-app/browser');

/**
 * Every prerendered route, read from the sitemap the build ships (which the
 * docs generator derives from `app.routes.ts`, like the prerender list).
 * Only the paths whose `index.html` the build actually wrote are kept, so a
 * route that is a host redirect (`vercel.json`) is not crawled as a page.
 */
export function prerenderedRoutes(): string[] {
  const sitemap = join(DIST, 'sitemap.xml');
  if (!existsSync(sitemap)) {
    throw new Error(
      `${sitemap} is missing — build the site first (npx nx run dev-app:build)`,
    );
  }
  const xml = readFileSync(sitemap, 'utf8');
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, loc]) => new URL(loc).pathname,
  );
  return paths.filter((path) =>
    existsSync(join(DIST, path === '/' ? '' : path, 'index.html')),
  );
}

/** Everything a page reported that a spec may want to fail on. */
export interface PageReport {
  readonly console: string[];
  readonly errors: string[];
  /** Requests that failed or answered >= 400 — context when a page stalls. */
  readonly requests: string[];
}

/** Starts collecting console errors/warnings and uncaught errors. */
export function collect(page: Page): PageReport {
  const report: PageReport = { console: [], errors: [], requests: [] };
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      report.console.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => report.errors.push(String(error)));
  page.on('requestfailed', (request) =>
    report.requests.push(`${request.url()} ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      report.requests.push(`${response.url()} ${response.status()}`);
    }
  });
  return report;
}

/**
 * Waits until Angular has hydrated the prerendered DOM: hydration removes
 * each element's `ngh` annotation as it claims it (and cleans up the
 * dehydrated views it did not claim), so a page with `ngh` attributes left
 * is one hydration never finished. Polled, never read once.
 */
export async function expectHydrated(
  page: Page,
  report?: PageReport,
): Promise<void> {
  try {
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            rendered: document.querySelector('app-root > *') !== null,
            pending: document.querySelectorAll('[ngh]').length,
          })),
        { timeout: 20_000 },
      )
      .toEqual({ rendered: true, pending: 0 });
  } catch (failure) {
    // a stalled hydration is easier to read with what the page said
    throw new Error(
      `${String(failure)}\npage report: ${JSON.stringify(report ?? {}, null, 2)}`,
    );
  }
}
