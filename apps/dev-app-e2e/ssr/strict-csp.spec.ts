import { test, expect, type Page } from '@playwright/test';
import { collect, expectHydrated } from './routes';

/**
 * The suite under a **strict** Content-Security-Policy (ARCHITECTURE → "SSR
 * and hydration", SECURITY.md → "Trusted Types"): `serve-prerendered.mjs`
 * answers `x-oge-csp: strict` with a per-request nonce for scripts and
 * `<style>` elements, `'strict-dynamic'`, `require-trusted-types-for
 * 'script'` and a `trusted-types` allowlist of exactly Angular's policies and
 * the `oge-ui#…` ones SECURITY.md documents. Representative pages are loaded
 * and driven through their sinks — BPMN XML import (`DOMParser`), an HTML
 * overlay badge (`[innerHTML]`), the overlay portals, the lazy grid and chart
 * exports — and must hydrate without a single violation.
 */
test.use({ extraHTTPHeaders: { 'x-oge-csp': 'strict' } });

const VIOLATION = /Content Security Policy|Trusted ?Type|Refused to/i;

async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(
        `${event.effectiveDirective}: ${event.blockedURI || 'inline'} ` +
          `(${event.sourceFile}:${event.lineNumber}) ${event.sample}`,
      );
    });
  });
  const report = collect(page);
  return async () => [
    ...(await page.evaluate(
      () =>
        (window as unknown as { __cspViolations: string[] }).__cspViolations,
    )),
    ...report.console.filter((line) => VIOLATION.test(line)),
    ...report.errors,
  ];
}

test.describe('strict CSP + Trusted Types', () => {
  test('the strict policy is the one served', async ({ page }) => {
    const response = await page.goto('/components/data-grid');
    const policy = response?.headers()['content-security-policy'];
    expect(policy).toMatch(/script-src 'nonce-[^']+' 'strict-dynamic'/);
    expect(policy).toContain("require-trusted-types-for 'script'");
    expect(policy).toContain('oge-ui#bpmn');
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).toContain("form-action 'self' https://stackblitz.com");
  });

  test('docs: "Open in StackBlitz" posts under form-action', async ({
    page,
  }) => {
    const violations = await watchViolations(page);
    // StackBlitz is never contacted: the POST is answered with a stub. A
    // request only reaches this route when the CSP let the form submit.
    const posts: string[] = [];
    await page.context().route('https://stackblitz.com/**', async (route) => {
      posts.push(`${route.request().method()} ${route.request().url()}`);
      await route.fulfill({ status: 200, contentType: 'text/html', body: '' });
    });
    await page.goto('/components/buttons');
    await expectHydrated(page);
    const card = page.locator('app-demo-card:has(#sizes)');
    await card.getByRole('button', { name: 'Code', exact: true }).click();
    const popup = page.waitForEvent('popup');
    await card.getByRole('button', { name: 'Open in StackBlitz' }).click();
    await popup;
    await expect
      .poll(() => posts)
      .toEqual([
        'POST https://stackblitz.com/run?file=src%2Fapp%2Fapp.component.ts',
      ]);
    expect(await violations()).toEqual([]);
  });

  test('grid: hydrates and exports CSV and Excel', async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto('/components/data-grid');
    await expectHydrated(page);
    await expect(page.locator('.oge-row').first()).toBeVisible();

    const csv = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    expect((await csv).suggestedFilename()).toBe('employees.csv');
    // the lazy export-excel chunk loads under 'strict-dynamic'
    const xlsx = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel' }).click();
    expect((await xlsx).suggestedFilename()).toBe('employees.xlsx');

    expect(await violations()).toEqual([]);
  });

  test('bpmn: XML import through the oge-ui#bpmn policy and an HTML badge', async ({
    page,
  }) => {
    const violations = await watchViolations(page);
    await page.goto('/components/bpmn');
    await expectHydrated(page);
    // the monitoring demo imports the sample XML on load (DOMParser sink)
    const monitor = page.locator(
      'app-demo-card:has(#overlays-monitoring) oge-bpmn-editor',
    );
    await monitor.scrollIntoViewIfNeeded();
    await expect(monitor.locator('.oge-bpmn-shape')).toHaveCount(5);
    await monitor.locator('.oge-bpmn-shape').nth(1).click();
    await page.locator('[data-testid="bpmn-add-overlay"]').click();
    // the badge markup renders through Angular's sanitizing [innerHTML]
    await expect(monitor.locator('.oge-bpmn-overlay')).toHaveCount(1);

    // the import/export demo parses on demand, too
    await page.locator('[data-testid="bpmn-import"]').click();
    await expect(
      page.locator('app-demo-card:has(#import-export) .oge-bpmn-shape'),
    ).toHaveCount(5);

    expect(await violations()).toEqual([]);
  });

  for (const framework of ['angular', 'react'] as const) {
    const query = framework === 'react' ? '?framework=react' : '';

    test(`overlay (${framework}): modal portal, focus trap and styles`, async ({
      page,
    }) => {
      const violations = await watchViolations(page);
      await page.goto(`/components/overlay/modal${query}`);
      await expectHydrated(page);
      const card = page.locator('app-demo-card', { hasText: 'Basics' }).first();
      await card.getByRole('button', { name: 'Open modal' }).click();
      const dialog = page.getByRole('dialog', { name: 'Team settings' });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);

      expect(await violations()).toEqual([]);
    });
  }

  test('charts: JPEG and PDF export', async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto('/components/charts');
    await expectHydrated(page);
    const card = page.locator('app-demo-card:has(#export-print)');
    await card.scrollIntoViewIfNeeded();
    for (const [label, file] of [
      ['JPEG', 'energy.jpeg'],
      ['PDF', 'energy.pdf'],
    ] as const) {
      const download = page.waitForEvent('download');
      await card.getByRole('button', { name: label, exact: true }).click();
      expect((await download).suggestedFilename()).toBe(file);
    }

    expect(await violations()).toEqual([]);
  });
});
