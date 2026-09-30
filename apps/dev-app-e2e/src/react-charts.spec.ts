import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the charts family (ADR 0002 + `docs/REACT-PARITY.md`):
 * the overview and API pages render the real React charts on the same routes
 * the Angular view uses, rendering, legend, tooltip/crosshair, drag-select
 * zoom with Escape reset, keyboard inspection, pie selection, the polar grid
 * and the linked range selector work on real DOM, and the page is axe-clean.
 * Mirrors `charts.spec.ts` case for case.
 */
const REACT = '?framework=react';

function card(page: Page, id: string): Locator {
  return page.locator(`app-demo-card:has(#${id}) app-react-host`);
}

async function open(page: Page): Promise<void> {
  await page.goto(`/components/charts${REACT}`);
  await expect(page.locator('html')).toHaveAttribute('data-framework', 'react');
}

test.describe('React charts docs', () => {
  test('the overview mounts the React charts without the coverage notice', async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByRole('status')).toHaveCount(0);
    const host = card(page, 'getting-started').locator('.oge-chart');
    await host.scrollIntoViewIfNeeded();
    await expect(host.locator('.oge-chart-line')).toHaveCount(1);
    await expect(host.locator('.oge-chart-bar')).toHaveCount(4);
    const labels = host.locator('.oge-chart-arg-label');
    await expect(labels).toHaveCount(4);
    await expect(labels.first()).toHaveText('Q1');
    await expect(host.locator('.oge-chart-sr-table tbody tr')).toHaveCount(4);
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/charts/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    for (const name of [
      '<OgeChart>',
      '<OgePieChart>',
      '<OgePolarChart>',
      '<OgeRangeSelector>',
    ]) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
  });

  test('legend click hides the series and rescales', async ({ page }) => {
    await open(page);
    const host = card(page, 'getting-started').locator('.oge-chart');
    await host.scrollIntoViewIfNeeded();
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
    await open(page);
    const host = card(page, 'getting-started').locator('.oge-chart');
    await host.scrollIntoViewIfNeeded();
    const box = await host.locator('.oge-chart-svg').boundingBox();
    if (box === null) throw new Error('no svg box');
    await page.mouse.move(box.x + 120, box.y + box.height / 2);
    await expect(host.locator('.oge-chart-crosshair')).toHaveCount(1);
    await expect(host.locator('.oge-chart-tooltip')).toBeVisible();
    await expect(host.locator('.oge-chart-tooltip')).toContainText('Q1');
  });

  test('drag-select zooms the perf chart; Escape resets', async ({ page }) => {
    await open(page);
    const host = card(page, 'zoom-pan-tooltips').locator('.oge-chart');
    await host.scrollIntoViewIfNeeded();
    const box = await host.locator('.oge-chart-svg').boundingBox();
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
    await open(page);
    const host = card(page, 'selection-i18n-export').locator('.oge-chart');
    await host.scrollIntoViewIfNeeded();
    await host.locator('.oge-chart-plot-wrap').focus();
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
    await open(page);
    const host = card(page, 'pie-doughnut').locator('.oge-pie-chart');
    await host.scrollIntoViewIfNeeded();
    const slices = host.locator('.oge-chart-pie-slice');
    await expect(slices).toHaveCount(5); // topN 4 + Others
    const before = await slices.first().getAttribute('d');
    await slices.first().dispatchEvent('click');
    await expect
      .poll(async () => slices.first().getAttribute('d'))
      .not.toBe(before);
    await expect(host.locator('.oge-chart-sr-table')).toContainText('Others');
  });

  test('polar radar renders spider grid, loops and category labels', async ({
    page,
  }) => {
    await open(page);
    const host = card(page, 'polar-radar').locator('.oge-polar-chart');
    await host.scrollIntoViewIfNeeded();
    const ring = host.locator('.oge-chart-grid').first();
    await expect.poll(async () => ring.getAttribute('d')).not.toContain('A ');
    await expect(host.locator('.oge-chart-area')).toHaveCount(1);
    await expect(host.locator('.oge-chart-line')).toHaveCount(2);
    await expect(host.locator('.oge-chart-svg')).toContainText('TypeScript');
  });

  test('range selector window drives the linked chart zoom', async ({
    page,
  }) => {
    await open(page);
    const demo = card(page, 'range-selector');
    await demo.scrollIntoViewIfNeeded();
    const chartHost = demo.locator('.oge-chart:not(.oge-range-selector)');
    const selector = demo.locator('.oge-range-selector');
    const labelsBefore = await chartHost
      .locator('.oge-chart-arg-label')
      .allTextContents();
    const handle = selector.locator('.oge-range-handle').first();
    const box = await handle.boundingBox();
    if (box === null) throw new Error('no handle box');
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect
      .poll(async () =>
        (
          await chartHost.locator('.oge-chart-arg-label').allTextContents()
        ).join(),
      )
      .not.toBe(labelsBefore.join());
    await handle.focus();
    const nowBefore = await handle.getAttribute('aria-valuenow');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => handle.getAttribute('aria-valuenow'))
      .not.toBe(nowBefore);
  });

  test('axe: no violations in either theme', async ({ page }) => {
    test.slow();
    await open(page);
    await card(page, 'getting-started').scrollIntoViewIfNeeded();
    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('app-react-host .oge-chart')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
