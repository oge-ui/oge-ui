import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Data Grid interaction depth (both render layers): cell ranges, clipboard,
 * fill handle, undo, conditional formats, merged cells, overflow hints,
 * auto-fit, pinned and sticky rows, cross-grid row drag and the Excel-style
 * header filter menu — on the real docs pages.
 */
const LAYERS = [
  { name: 'Angular', query: '', host: 'oge-grid' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-grid',
  },
] as const;

const cell = (grid: Locator, row: number, col: number): Locator =>
  grid.locator(`[data-cell="${row}-${col}"]`);

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast', 'heading-order', 'empty-table-header'])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const layer of LAYERS) {
  test.describe(`${layer.name} grid interaction depth`, () => {
    test('selects a cell range, copies TSV, pastes, fills and undoes', async ({
      page,
      context,
      browserName,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'reads the clipboard: Playwright grants clipboard-read in Chromium only',
      );
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(`/components/data-grid/range-selection${layer.query}`);
      const grid = page.locator(layer.host).first();
      await expect(cell(grid, 0, 0)).toBeVisible();

      // click + shift-click: a 3 × 2 range
      await cell(grid, 0, 0).click();
      await cell(grid, 2, 1).click({ modifiers: ['Shift'] });
      await expect(grid.locator('.oge-cell-range')).toHaveCount(6);
      await expect(cell(grid, 1, 1)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.demo-range-summary')).toContainText(
        '6 cells in 1 range(s)',
      );

      // Ctrl+C: TSV with the captions (copyHeaders)
      await page.keyboard.press('Control+C');
      await expect
        .poll(() => page.evaluate(() => navigator.clipboard.readText()))
        .toMatch(/^First name\tDepartment\r\n/);

      // Shift+Arrow extends from the keyboard
      await page.keyboard.press('Shift+ArrowDown');
      await expect(grid.locator('.oge-cell-range')).toHaveCount(8);

      // Ctrl+V pastes a block from the focused cell
      const before = (await cell(grid, 4, 0).textContent())?.trim();
      await cell(grid, 4, 0).click();
      await page.evaluate(() => navigator.clipboard.writeText('Zed\tLegal'));
      await page.keyboard.press('Control+V');
      await expect(cell(grid, 4, 0)).toHaveText('Zed');
      await expect(cell(grid, 4, 1)).toHaveText('Legal');

      // Ctrl+Z reverts the paste in one step
      await page.keyboard.press('Control+Z');
      await expect(cell(grid, 4, 0)).toHaveText(before ?? '');

      // the fill handle: drag the corner of a single salary cell down
      await cell(grid, 0, 2).click();
      const salary = (await cell(grid, 0, 2).textContent())?.trim() ?? '';
      const handle = cell(grid, 0, 2).locator('.oge-fill-handle');
      await expect(handle).toBeVisible();
      const from = await handle.boundingBox();
      const to = await cell(grid, 3, 2).boundingBox();
      if (!from || !to) throw new Error('no layout');
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
        steps: 8,
      });
      await expect(grid.locator('.oge-cell-fill-preview')).toHaveCount(3);
      await page.mouse.up();
      await expect(cell(grid, 3, 2)).toHaveText(salary);
      await expect(grid.locator('.oge-cell-range')).toHaveCount(4);

      await axe(page);
    });

    test('formats cells with tokens, merges equal values, hints and auto-fits', async ({
      page,
    }) => {
      await page.goto(
        `/components/data-grid/conditional-formatting${layer.query}`,
      );
      const formats = page.locator(layer.host).first();
      await expect(formats.locator('.oge-cf-databar').first()).toBeVisible();
      await expect(formats.locator('.oge-cf-scale').first()).toBeVisible();
      await expect(formats.locator('.oge-cf-icon').first()).toBeVisible();

      const spans = page.locator(layer.host).nth(1);
      await expect(spans.locator('[aria-rowspan]').first()).toBeVisible();
      await expect(spans.locator('[aria-colspan]').first()).toBeVisible();

      // keyboard: ArrowDown from a merged cell leaves its whole area
      const owner = spans.locator('[aria-rowspan]').first();
      const span = Number(await owner.getAttribute('aria-rowspan'));
      const [row] = ((await owner.getAttribute('data-cell')) ?? '0-0')
        .split('-')
        .map(Number);
      await owner.click();
      await page.keyboard.press('ArrowDown');
      await expect(cell(spans, row + span, 0)).toBeFocused();

      // the narrow City column: hover a truncated cell for the full text
      // the first city whose text the 64px column clips
      const clipped = await spans
        .locator('[data-cell$="-1"]')
        .evaluateAll((cells) =>
          cells.findIndex((c) => c.scrollWidth > c.clientWidth + 1),
        );
      expect(clipped).toBeGreaterThanOrEqual(0);
      const city = spans.locator('[data-cell$="-1"]').nth(clipped);
      await city.hover();
      const hint = page.locator('.oge-grid-cell-hint');
      await expect(hint).toBeVisible();
      await expect(hint).toHaveText(((await city.textContent()) ?? '').trim());

      // double-click the resize handle: the column fits its content
      const header = spans.getByRole('columnheader', { name: 'City' });
      const separator = header.locator('.oge-resize-handle');
      const width = Number(await separator.getAttribute('aria-valuenow'));
      await separator.dblclick();
      await expect
        .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
        .toBeGreaterThan(width);

      await axe(page);
    });

    test('pins rows, keeps group rows sticky and drags rows between grids', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/pinned-rows${layer.query}`);
      const pinned = page.locator(layer.host).first();
      await expect(pinned.locator('.oge-header .oge-pinned-row')).toContainText(
        'Budget',
      );
      await expect(pinned.locator('.oge-footer .oge-pinned-row')).toContainText(
        'Total',
      );
      // first / last / go-to-page and the custom info text
      await pinned.locator('.oge-pager-last').click();
      await expect(pinned.locator('.oge-pager-input-field')).toHaveValue('5');
      await expect(pinned.locator('.oge-pager-info')).toContainText('of 23');
      await expect(pinned.locator('.oge-header .oge-pinned-row')).toBeVisible();

      // sticky group rows follow the scroll position (virtual scrolling)
      const sticky = page.locator(layer.host).nth(1);
      await expect(sticky.locator('.oge-group-row').first()).toBeVisible();
      await sticky
        .locator('.oge-viewport')
        .evaluate((viewport) => (viewport.scrollTop = 900));
      await expect(
        sticky.locator('.oge-sticky-groups .oge-sticky-group-row').first(),
      ).toBeVisible();

      // drag a task from "To do" onto "Done"
      const todo = page.locator('.demo-drag-todo').first();
      const done = page.locator('.demo-drag-done').first();
      await expect(done.locator('.oge-rows .oge-row')).toHaveCount(1);
      await done.scrollIntoViewIfNeeded();
      const grip = todo.locator('.oge-drag-handle').first();
      const from = await grip.boundingBox();
      const target = await done
        .locator('.oge-rows .oge-row')
        .first()
        .boundingBox();
      if (!from || !target) throw new Error('no layout');
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + 40, target.y + target.height - 4, {
        steps: 10,
      });
      await page.mouse.up();
      await expect(done.locator('.oge-rows .oge-row')).toHaveCount(2);
      await expect(todo.locator('.oge-rows .oge-row')).toHaveCount(2);

      await axe(page);
    });

    test('opens the Excel-style header filter menu with a date tree', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/filtering${layer.query}`);
      const grid = page.locator(`.demo-filter-menu`).first();
      const gridEl = layer.query ? grid.locator('.oge-grid') : grid;
      await expect(gridEl.locator('.oge-rows .oge-row').first()).toBeVisible();
      await gridEl
        .getByRole('columnheader', { name: 'Hired' })
        .locator('.oge-header-filter-btn')
        .click();
      const menu = page.locator('.oge-header-filter-menu');
      await expect(menu.locator('.oge-hf-conditions')).toBeVisible();
      await expect(menu.locator('.oge-hf-condition')).toHaveCount(2);
      await expect(menu.locator('.oge-hf-group').first()).toBeVisible();
      await expect(menu.locator('.oge-hf-month').first()).toBeVisible();
      // collapsing a year hides its months
      const months = await menu.locator('.oge-hf-month').count();
      await menu.locator('.oge-hf-toggle').first().click();
      await expect
        .poll(() => menu.locator('.oge-hf-month').count())
        .toBeLessThan(months);
    });
  });
}
