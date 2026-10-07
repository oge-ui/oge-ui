import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * axe `color-contrast` over the components themselves (every top-level
 * `.oge-*` element) on the representative pages, in the light and the dark
 * theme. The rest of the suite scans with the rule off because the docs
 * chrome's palette is the site's concern; a component that fails contrast
 * fails for every consumer, so it is fixed in the tokens (`_tokens.scss` and
 * every theme), never with a raw value. The nightly crawl
 * (`a11y/axe-crawl.spec.ts`) runs the same scan over every route.
 */
test.beforeEach(() => test.slow());

const PAGES = [
  '/components/data-grid',
  '/components/buttons',
  '/components/tabs',
  '/components/inputs/select-box',
  '/components/inputs/date-box',
  '/components/inputs/toggle-controls',
  '/components/tree-view',
  '/components/kanban',
  '/components/scheduler',
  '/components/charts',
  '/components/overlay/modal',
  '/components/forms',
];

async function openIn(page: Page, path: string, theme: 'light' | 'dark') {
  await page.addInitScript((mode) => {
    try {
      localStorage.setItem('oge-docs-mode', mode);
    } catch {
      // storage blocked: the theme check below fails loudly
    }
  }, theme);
  await page.goto(path);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  if (theme === 'dark') {
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.styleSheets].some(
            (sheet) => !!sheet.href?.includes('themes/dark.css'),
          ),
        ),
      )
      .toBe(true);
  }
  // colours transition after a theme switch; let them settle
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState !== 'running'),
    undefined,
    { timeout: 10_000 },
  );
}

/**
 * Demos whose colours are the demo's own input, not the library's tokens:
 * "Custom colors" passes brand hex values to `color` to show the API, and a
 * consumer's custom colour is theirs to pair (`--oge-btn-contrast`). A fixed
 * colour cannot read on both the light and the dark page anyway.
 */
const CONTRAST_EXEMPT_DEMOS = ['custom-colors'];

/** Marks the top-level component roots (theme classes on <html> excluded). */
async function markComponents(page: Page): Promise<number> {
  return page.evaluate((exempt) => {
    const skipped = exempt
      .map((id) => document.getElementById(id)?.closest('app-demo-card'))
      .filter((card): card is Element => !!card);
    const isComponent = (el: Element) =>
      el !== document.documentElement &&
      el !== document.body &&
      [...el.classList].some((name) => name.startsWith('oge-'));
    const roots = [...document.body.querySelectorAll('[class*="oge-"]')]
      .filter(isComponent)
      .filter((el) => !skipped.some((card) => card.contains(el)))
      .filter((el) => {
        for (let up = el.parentElement; up; up = up.parentElement) {
          if (isComponent(up)) return false;
        }
        return true;
      });
    for (const root of roots) root.setAttribute('data-axe-component', '');
    return roots.length;
  }, CONTRAST_EXEMPT_DEMOS);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`component contrast (${theme})`, () => {
    for (const path of PAGES) {
      test(`${path} components meet color-contrast`, async ({ page }) => {
        await openIn(page, path, theme);
        expect(await markComponents(page)).toBeGreaterThan(0);
        const results = await new AxeBuilder({ page })
          .withRules(['color-contrast'])
          .include('[data-axe-component]')
          .analyze();
        expect(
          results.violations.flatMap((v) =>
            v.nodes.map(
              (n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? v.help}`,
            ),
          ),
        ).toEqual([]);
      });
    }
  });
}
