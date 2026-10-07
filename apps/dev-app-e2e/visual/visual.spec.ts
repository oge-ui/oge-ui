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

async function open(page: Page, route: string, theme: Theme): Promise<void> {
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
  if (route.includes('framework=react')) {
    await expect(html).toHaveAttribute('data-framework', 'react');
  }
}

/**
 * Fonts loaded, no transition or animation still running (a theme applied
 * at boot can transition the controls' colours) and two frames painted.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/**
 * The demo card with the given heading anchor id (`app-demo-card:has(#id)`,
 * as the functional specs address cards), or the page's first card.
 */
function card(page: Page, id?: string): Locator {
  return id
    ? page.locator(`app-demo-card:has(#${id})`)
    : page.locator('app-demo-card').first();
}

/**
 * The card's preview pane: `app-demo-card > section > div.p-4` (the card's
 * own frame — never a `.p-4` inside the demo itself).
 */
function preview(page: Page, id?: string): Locator {
  return card(page, id).locator(':scope > section > div.p-4');
}

/**
 * `OGE_VISUAL_DRY=1` (`node tools/e2e/visual.mjs --local`) runs every shot
 * against a local browser without comparing or writing a baseline: it proves
 * the locators match and the demos render, where Docker is unavailable. A
 * local rasteriser must never write the committed PNGs.
 */
const DRY = !!process.env['OGE_VISUAL_DRY'];

interface Shot {
  name: string;
  route: string;
  /** an element inside the preview that proves the demo has rendered */
  ready: string;
  themes: readonly Theme[];
  /** the demo card's heading anchor id; omitted → the page's first card */
  card?: string;
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
      await open(page, shot.route, theme);
      const target = preview(page, shot.card);
      await expect(target).toHaveCount(1);
      await target.scrollIntoViewIfNeeded();
      await expect(target.locator(shot.ready).first()).toBeVisible({
        timeout: 30_000,
      });
      await settle(page);
      const mask = (shot.mask ?? []).map((selector) => page.locator(selector));
      if (DRY) {
        const box = await target.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(100);
        expect(box?.height ?? 0).toBeGreaterThan(40);
        // kept in the (git-ignored) test output for a look, never compared
        await target.screenshot({
          animations: 'disabled',
          mask,
          path: test.info().outputPath(`${shot.name}-${theme}.png`),
        });
        return;
      }
      await expect(target).toHaveScreenshot(`${shot.name}-${theme}.png`, {
        mask,
      });
    });
  }
}
