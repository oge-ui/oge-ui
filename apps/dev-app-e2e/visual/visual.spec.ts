import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Pixel baselines of the components' resting look, per theme and render
 * layer. They complement `src/visual-states.spec.ts` (which guards *state*
 * colours through computed styles): a screenshot is what catches a broken
 * layout, a lost border or a token wired to the wrong surface.
 *
 * Never update these from a local browser — `npm run e2e:visual:update`
 * renders them inside the Playwright Docker image CI uses (see
 * playwright.visual.config.mts). Volatile regions (today's date, clocks,
 * the docs code tab) are masked or frozen: the clock is pinned and motion is
 * reduced.
 */
type Theme = 'light' | 'dark' | 'high-contrast';

/** A fixed "now", so a calendar or a relative date paints the same day. */
const NOW = new Date('2026-03-16T10:00:00Z');

async function open(
  page: Page,
  route: string,
  theme: Theme,
  ready: string,
): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((theme) => {
    try {
      localStorage.setItem(
        'oge-docs-mode',
        theme === 'light' ? 'light' : 'dark',
      );
      localStorage.setItem(
        'oge-docs-grid-theme',
        theme === 'high-contrast' ? 'high-contrast' : 'default',
      );
    } catch {
      // storage blocked — the test then fails on the theme class below
    }
  }, theme);
  await page.goto(route);
  const html = page.locator('html');
  if (theme === 'dark') await expect(html).toHaveClass(/oge-theme-dark/);
  if (theme === 'high-contrast') {
    await expect(html).toHaveClass(/oge-theme-high-contrast/);
  }
  // theme stylesheets are lazy links; wait until every one has applied
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')]
          .filter((link) => link.href.includes('/themes/'))
          .every((link) => !!link.sheet),
      ),
    )
    .toBe(true);
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** The preview pane of the page's first (or the named) demo card. */
function preview(page: Page, heading?: string): Locator {
  const card = heading
    ? page.locator('app-demo-card').filter({
        has: page.getByRole('heading', { name: heading, exact: true }),
      })
    : page.locator('app-demo-card').first();
  // the card's own frame → its preview pane (not a `.p-4` inside the demo)
  return card.locator(
    'xpath=./div/div[contains(concat(" ", normalize-space(@class), " "), " p-4 ")]',
  );
}

interface Shot {
  name: string;
  route: string;
  /** an element that proves the demo has rendered */
  ready: string;
  themes: readonly Theme[];
  heading?: string;
  /** regions repainted by time or data, masked out of the comparison */
  mask?: readonly string[];
}

const ALL: readonly Theme[] = ['light', 'dark', 'high-contrast'];
const LIGHT_DARK: readonly Theme[] = ['light', 'dark'];

const SHOTS: readonly Shot[] = [
  {
    name: 'grid',
    route: '/components/data-grid',
    ready: '.oge-row',
    themes: ALL,
  },
  {
    name: 'grid-react',
    route: '/components/data-grid?framework=react',
    ready: '.oge-row',
    themes: LIGHT_DARK,
  },
  {
    name: 'buttons',
    route: '/components/buttons',
    ready: '.oge-button',
    themes: ALL,
  },
  {
    name: 'buttons-react',
    route: '/components/buttons?framework=react',
    ready: '.oge-button',
    themes: ['light'],
  },
  {
    name: 'tabs',
    route: '/components/tabs',
    ready: '[role=tab]',
    themes: ALL,
  },
  {
    name: 'tabs-react',
    route: '/components/tabs?framework=react',
    ready: '[role=tab]',
    themes: ['light'],
  },
  {
    name: 'date-box',
    route: '/components/inputs/date-box',
    ready: '.oge-calendar',
    themes: LIGHT_DARK,
  },
  {
    name: 'select-box',
    route: '/components/inputs/select-box',
    ready: '.oge-select-box',
    themes: LIGHT_DARK,
  },
  {
    name: 'tree-view',
    route: '/components/tree-view',
    ready: '[role=treeitem]',
    themes: LIGHT_DARK,
  },
  {
    name: 'kanban',
    route: '/components/kanban',
    ready: '.oge-kanban-card',
    themes: LIGHT_DARK,
  },
  {
    name: 'kanban-react',
    route: '/components/kanban?framework=react',
    ready: '.oge-kanban-card',
    themes: ['light'],
  },
  {
    name: 'charts',
    route: '/components/charts',
    ready: '.oge-chart svg',
    themes: LIGHT_DARK,
  },
  {
    name: 'modal',
    route: '/components/overlay/modal',
    ready: '.oge-button',
    themes: ['light'],
  },
];

for (const shot of SHOTS) {
  for (const theme of shot.themes) {
    test(`${shot.name} (${theme})`, async ({ page }) => {
      await open(page, shot.route, theme, shot.ready);
      const target = preview(page, shot.heading);
      await target.scrollIntoViewIfNeeded();
      await expect(target).toHaveScreenshot(`${shot.name}-${theme}.png`, {
        mask: (shot.mask ?? []).map((selector) => page.locator(selector)),
      });
    });
  }
}
