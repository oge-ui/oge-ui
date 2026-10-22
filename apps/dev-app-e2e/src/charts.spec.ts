import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * jsdom cannot lay out SVG, measure paths or drive real pointer capture —
 * this suite proves the charts' rendering, legend interaction, tooltip and
 * crosshair, drag-select zoom with Escape reset, keyboard inspection, pie
 * selection and axe-clean accessibility on real DOM in both themes.
 */

const BASIC = 'app-demo-card:has(#getting-started)';

function chart(page: Page): Locator {
  return page.locator(`${BASIC} oge-chart`);
}

async function openBasic(page: Page): Promise<void> {
  await page.goto('/components/charts');
  await chart(page).scrollIntoViewIfNeeded();
}

/**
 * Clicks `button` from inside the page and samples the first bar's height
 * every frame for `ms` from that click. The click is dispatched in the page
 * so the window starts with it: a Playwright click takes WebKit a few
 * hundred milliseconds — on a slow runner, most of the tween.
 */
async function sampleBarHeights(
  host: Locator,
  button: Locator,
  ms = 1500,
): Promise<number[]> {
  const target = await button.elementHandle();
  return host.evaluate(
    (el, [target, duration]) =>
      new Promise<number[]>((resolve) => {
        const height = (): number =>
          Number(
            el.querySelector('rect.oge-chart-bar')?.getAttribute('height') ?? 0,
          );
        const seen = [height()];
        (target as HTMLElement).click();
        const start = performance.now();
        const step = (): void => {
          seen.push(height());
          if (performance.now() - start < duration) requestAnimationFrame(step);
          else resolve(seen);
        };
        requestAnimationFrame(step);
      }),
    [target, ms] as const,
  );
}

/**
 * How many distinct heights lie strictly between the first and the last
 * sample — a tween passes through some, a jump through none. Counting them
 * instead of frames keeps the check free of the runner's frame rate.
 */
function heightsBetween(heights: readonly number[]): number {
  const from = heights[0];
  const to = heights[heights.length - 1];
  const low = Math.min(from, to) + 0.5;
  const high = Math.max(from, to) - 0.5;
  return new Set(
    heights.filter((h) => h > low && h < high).map((h) => h.toFixed(1)),
  ).size;
}

test.describe('charts', () => {
  test(
    'renders bars, a line path, axis labels and the sr data table',
    { tag: '@smoke' },
    async ({ page }) => {
      await openBasic(page);
      const host = chart(page);
      await expect(host.locator('.oge-chart-line')).toHaveCount(1);
      await expect(host.locator('.oge-chart-bar')).toHaveCount(4);
      const labels = host.locator('.oge-chart-arg-label');
      await expect(labels).toHaveCount(4);
      await expect(labels.first()).toHaveText('Q1');
      await expect(host.locator('.oge-chart-sr-table tbody tr')).toHaveCount(4);
    },
  );

  test('legend click hides the series and rescales', async ({ page }) => {
    await openBasic(page);
    const host = chart(page);
    const button = host.getByRole('button', { name: 'Product' });
    await button.click();
    await expect(host.locator('.oge-chart-bar')).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(host.locator('.oge-chart-bar')).toHaveCount(4);
  });

  test('hovering shows the crosshair and tooltip near the left edge', async ({
    page,
  }) => {
    await openBasic(page);
    const host = chart(page);
    const svg = host.locator('.oge-chart-svg');
    const box = await svg.boundingBox();
    if (box === null) throw new Error('no svg box');
    // hover inside the plot, left half — the page TOC overlays the right
    await page.mouse.move(box.x + 120, box.y + box.height / 2);
    // an SVG <line> has a zero-area box — assert presence, not visibility
    await expect(host.locator('.oge-chart-crosshair')).toHaveCount(1);
    await expect(host.locator('.oge-chart-tooltip')).toBeVisible();
    await expect(host.locator('.oge-chart-tooltip')).toContainText('Q1');
  });

  test('drag-select zooms the perf chart; Escape resets', async ({ page }) => {
    await page.goto('/components/charts');
    const host = page.locator(
      'app-demo-card:has(#zoom-pan-tooltips) oge-chart',
    );
    await host.scrollIntoViewIfNeeded();
    const svg = host.locator('.oge-chart-svg');
    const box = await svg.boundingBox();
    if (box === null) throw new Error('no svg box');
    const labelsBefore = await host
      .locator('.oge-chart-arg-label')
      .allTextContents();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 80, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, y, { steps: 6 });
    await expect(host.locator('.oge-chart-zoom-rect')).toBeVisible();
    await page.mouse.up();
    await expect
      .poll(async () =>
        (await host.locator('.oge-chart-arg-label').allTextContents()).join(),
      )
      .not.toBe(labelsBefore.join());
    // Escape on the focused plot resets
    await host.locator('.oge-chart-plot-wrap').focus();
    await page.keyboard.press('Escape');
    await expect
      .poll(async () =>
        (await host.locator('.oge-chart-arg-label').allTextContents()).join(),
      )
      .toBe(labelsBefore.join());
  });

  test('keyboard inspection announces points and Enter selects', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const host = page.locator(
      'app-demo-card:has(#selection-i18n-export) oge-chart',
    );
    await host.scrollIntoViewIfNeeded();
    const wrap = host.locator('.oge-chart-plot-wrap');
    await wrap.focus();
    await page.keyboard.press('ArrowRight');
    const live = host.locator('.oge-chart-live');
    await expect(live).toContainText('Value');
    await expect(live).toContainText('Jan');
    await page.keyboard.press('Enter');
    await expect(host.locator('.oge-chart-point-selected')).toHaveCount(1);
  });

  test('pie: doughnut slices, grouping, click explodes and selects', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const host = page.locator('app-demo-card:has(#pie-doughnut) oge-pie-chart');
    await host.scrollIntoViewIfNeeded();
    const slices = host.locator('.oge-chart-pie-slice');
    await expect(slices).toHaveCount(5); // topN 4 + Others
    const before = await slices.first().getAttribute('d');
    // the bbox center of a large doughnut slice falls in the hole —
    // dispatch the click instead of aiming a pointer
    await slices.first().dispatchEvent('click');
    await expect
      .poll(async () => slices.first().getAttribute('d'))
      .not.toBe(before);
    await expect(host.locator('.oge-chart-sr-table')).toContainText('Others');
  });

  test('polar radar renders spider grid, loops and category labels', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const host = page.locator(
      'app-demo-card:has(#polar-radar) oge-polar-chart',
    );
    await host.scrollIntoViewIfNeeded();
    // spider grid: polygon rings without arc commands
    const ring = host.locator('.oge-chart-grid').first();
    await expect.poll(async () => ring.getAttribute('d')).not.toContain('A ');
    await expect(host.locator('.oge-chart-area')).toHaveCount(1);
    await expect(host.locator('.oge-chart-line')).toHaveCount(2);
    await expect(host.locator('.oge-chart-svg')).toContainText('TypeScript');
  });

  test('range selector window drives the linked chart zoom', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const card = page.locator('app-demo-card:has(#range-selector)');
    await card.scrollIntoViewIfNeeded();
    const chartHost = card.locator('oge-chart');
    const selector = card.locator('oge-range-selector');
    const labelsBefore = await chartHost
      .locator('.oge-chart-arg-label')
      .allTextContents();
    // drag the start handle to the right
    const handle = selector.locator('.oge-range-handle').first();
    // the card can be taller than the viewport, and engines differ in how
    // far scrollIntoViewIfNeeded scrolls it: bring the handle itself in
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    if (box === null) throw new Error('no handle box');
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    // the linked chart re-ticks to the narrower window
    await expect
      .poll(async () =>
        (
          await chartHost.locator('.oge-chart-arg-label').allTextContents()
        ).join(),
      )
      .not.toBe(labelsBefore.join());
    // keyboard on the handle also adjusts (slider pattern)
    await handle.focus();
    const nowBefore = await handle.getAttribute('aria-valuenow');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => handle.getAttribute('aria-valuenow'))
      .not.toBe(nowBefore);
  });

  test('axe: no violations in either theme', async ({ page }) => {
    test.slow();
    await openBasic(page);
    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('oge-chart')
        .include('oge-pie-chart')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});

/**
 * The depth sections (G2b): data labels and per-point colour, indicators and
 * trendlines, waterfall/pareto, box plot/histogram and export/print — real
 * layout, real hover, real downloads.
 */
test.describe('charts depth', () => {
  function section(page: Page, id: string): Locator {
    return page.locator(`app-demo-card:has(#${id})`);
  }

  test('data labels, per-point colours, nested doughnut and radial bars', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const card = section(page, 'data-labels');
    await card.scrollIntoViewIfNeeded();
    const bars = card.locator('oge-chart .oge-chart-bar');
    await expect(bars).toHaveCount(5);
    // South and West are below target → customizePoint paints them red
    await expect(bars.nth(1)).toHaveAttribute('fill', '#ef4444');
    await expect(card.locator('oge-chart .oge-chart-point-label')).toHaveCount(
      5,
    );
    await expect(
      card.locator('oge-chart .oge-chart-sr-table td').nth(1),
    ).toContainText('below target');
    await expect(
      card.locator('oge-pie-chart .oge-chart-pie-slice'),
    ).toHaveCount(6);
    await expect(
      card.locator('oge-pie-chart .oge-chart-legend-btn'),
    ).toHaveCount(3);
    await expect(
      card.locator('oge-polar-chart .oge-chart-radial-track'),
    ).toHaveCount(4);
  });

  test('indicators, the RSI pane and the trendline R² tooltip', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const card = section(page, 'trendlines-indicators');
    await card.scrollIntoViewIfNeeded();
    const charts = card.locator('oge-chart');
    await expect(
      charts.nth(0).locator('.oge-chart-ohlc').first(),
    ).toBeAttached();
    await expect(
      charts.nth(0).locator('.oge-chart-indicator-band'),
    ).toHaveCount(1);
    await expect(
      charts.nth(0).locator('.oge-chart-indicator-level'),
    ).toHaveCount(2);
    const scatter = charts.nth(1);
    await expect(scatter.locator('.oge-chart-trendline')).toHaveCount(1);
    const svg = scatter.locator('.oge-chart-svg');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    if (box === null) throw new Error('no svg box');
    await page.mouse.move(box.x + 120, box.y + box.height / 2);
    await expect(scatter.locator('.oge-chart-tooltip')).toContainText('R²');
  });

  test('waterfall kinds and the sorted pareto', async ({ page }) => {
    await page.goto('/components/charts');
    const card = section(page, 'waterfall-pareto');
    await card.scrollIntoViewIfNeeded();
    const waterfall = card.locator('oge-chart').nth(0);
    await expect(waterfall.locator('.oge-chart-waterfall-up')).toHaveCount(3);
    await expect(waterfall.locator('.oge-chart-waterfall-down')).toHaveCount(3);
    await expect(
      waterfall.locator('.oge-chart-waterfall-connector'),
    ).toHaveCount(7);
    const pareto = card.locator('oge-chart').nth(1);
    await expect(pareto.locator('.oge-chart-arg-label').first()).toHaveText(
      'Scratches',
    );
    await expect(pareto.locator('.oge-chart-pareto-line')).toHaveCount(1);
  });

  test('box plots and histogram bins', async ({ page }) => {
    await page.goto('/components/charts');
    const card = section(page, 'box-plot-histogram');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.oge-chart-box')).toHaveCount(4);
    await expect(card.locator('.oge-chart-dot').first()).toBeAttached();
    expect(
      await card.locator('.oge-chart-histogram-bar').count(),
    ).toBeGreaterThan(3);
  });

  test('JPEG and PDF downloads', async ({ page }) => {
    await page.goto('/components/charts');
    const card = section(page, 'export-print');
    await card.scrollIntoViewIfNeeded();
    for (const [label, file] of [
      ['JPEG', 'energy.jpeg'],
      ['PDF', 'energy.pdf'],
    ] as const) {
      const download = page.waitForEvent('download');
      await card.getByRole('button', { name: label, exact: true }).click();
      expect((await download).suggestedFilename()).toBe(file);
    }
  });

  test('axe: the depth demos have no violations', async ({ page }) => {
    test.slow();
    await page.goto('/components/charts');
    await section(page, 'data-labels').scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .include('app-charts-analytics-demos')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('live data tweens between values instead of jumping', async ({
    page,
  }) => {
    await page.goto('/components/charts');
    const host = page.locator('app-demo-card:has(#live-data) oge-chart');
    await host.scrollIntoViewIfNeeded();
    await expect(host.locator('rect.oge-chart-bar')).toHaveCount(6);
    // let the first-render draw-in finish
    await page.waitForTimeout(800);
    const button = page
      .locator('app-demo-card:has(#live-data)')
      .getByRole('button', { name: 'New values' });
    const heights = await sampleBarHeights(host, button);
    // the bar moved, through heights on the way
    expect(Math.abs(heights[heights.length - 1] - heights[0])).toBeGreaterThan(
      10,
    );
    expect(heightsBetween(heights)).toBeGreaterThan(0);
    // a month shift: one bar leaves, one enters, and it settles on six
    await page
      .locator('app-demo-card:has(#live-data)')
      .getByRole('button', { name: 'Next month' })
      .click();
    await expect(host.locator('rect.oge-chart-bar')).toHaveCount(6);
  });

  test('live data jumps under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/components/charts');
    const host = page.locator('app-demo-card:has(#live-data) oge-chart');
    await host.scrollIntoViewIfNeeded();
    await expect(host.locator('rect.oge-chart-bar')).toHaveCount(6);
    const button = page
      .locator('app-demo-card:has(#live-data)')
      .getByRole('button', { name: 'New values' });
    const heights = await sampleBarHeights(host, button);
    // the bar moved, straight to its new height
    expect(Math.abs(heights[heights.length - 1] - heights[0])).toBeGreaterThan(
      10,
    );
    expect(heightsBetween(heights)).toBe(0);
  });
});
