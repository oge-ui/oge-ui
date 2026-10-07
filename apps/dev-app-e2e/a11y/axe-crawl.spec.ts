import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { expectHydrated, prerenderedRoutes } from '../ssr/routes';

/**
 * The per-route axe crawl: every prerendered route, once per render layer,
 * scanned with the WCAG 2.0 A through 2.2 AA tags.
 *
 * - The whole page is scanned for structure (names, roles, landmarks, ARIA).
 * - `color-contrast` is scanned on the components only — every top-level
 *   `.oge-*` element. The docs chrome's own palette is the site's concern;
 *   a component that fails contrast fails for every consumer, so it is fixed
 *   in the tokens (`_tokens.scss` and every theme), never with a raw value.
 *
 * One page per test so the crawl shards (nightly.yml → a11y-crawl).
 */
const ROUTES = prerenderedRoutes();
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
/** Demos whose colours are the demo's input, not tokens (see contrast.spec.ts). */
const CONTRAST_EXEMPT_DEMOS = ['custom-colors'];

function summarise(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string[] {
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 5)
        .map((n) => n.target.join(' '))
        .join(' | ')}${v.nodes.length > 5 ? ` … +${v.nodes.length - 5}` : ''}`,
  );
}

async function scan(page: Page): Promise<string[]> {
  const structure = await new AxeBuilder({ page })
    .withTags(TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  const found = summarise(structure.violations);
  // mark the roots in the page (axe's include takes plain selectors); the
  // theme classes on <html> (`oge-theme-*`) do not make the page a component
  const roots = await page.evaluate((exempt) => {
    const skipped = exempt
      .map((id) => document.getElementById(id)?.closest('app-demo-card'))
      .filter((card): card is Element => !!card);
    const isComponent = (el: Element) =>
      el !== document.documentElement &&
      el !== document.body &&
      [...el.classList].some((name) => name.startsWith('oge-'));
    const found = [...document.body.querySelectorAll('[class*="oge-"]')]
      .filter(isComponent)
      .filter((el) => !skipped.some((card) => card.contains(el)))
      .filter((el) => {
        for (let up = el.parentElement; up; up = up.parentElement) {
          if (isComponent(up)) return false;
        }
        return true;
      });
    for (const root of found) root.setAttribute('data-axe-component', '');
    return found.length;
  }, CONTRAST_EXEMPT_DEMOS);
  if (roots > 0) {
    const contrast = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .include('[data-axe-component]')
      .analyze();
    found.push(...summarise(contrast.violations));
  }
  return found;
}

test.describe('axe crawl', () => {
  // axe on a full docs page is CPU-heavy
  test.slow();

  test('the crawl found the prerendered routes', () => {
    expect(ROUTES.length).toBeGreaterThan(100);
  });

  for (const route of ROUTES) {
    for (const framework of ['angular', 'react'] as const) {
      const url = framework === 'react' ? `${route}?framework=react` : route;

      test(`${url} has no WCAG A/AA violations`, async ({ page }) => {
        const response = await page.goto(url);
        expect(response?.status(), url).toBe(200);
        await expectHydrated(page);
        expect(await scan(page), url).toEqual([]);
      });
    }
  }
});
