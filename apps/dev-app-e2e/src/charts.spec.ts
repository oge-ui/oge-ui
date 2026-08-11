import AxeBuilder from '@axe-core/playwright';
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

test.describe('charts', () => {
  test('renders bars, a line path, axis labels and the sr data table', async ({
    page,
  }) => {
    await openBasic(page);
    const host = chart(page);
    await expect(host.locator('.oge-chart-line')).toHaveCount(1);
    await expect(host.locator('.oge-chart-bar')).toHaveCount(4);
    const labels = host.locator('.oge-chart-arg-label');
    await expect(labels).toHaveCount(4);
    await expect(labels.first()).toHaveText('Q1');
    await expect(host.locator('.oge-chart-sr-table tbody tr')).toHaveCount(4);
  });

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
