import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Right-to-left across the suite, in both render layers: the page is loaded
 * with `<html dir="rtl">` (set before the app boots, so every component reads
 * it through `ogeResolveDirection` on first render) and each family must
 * mirror its geometry *and* its horizontal arrow keys. jsdom has no layout,
 * so the geometry half can only be proved here.
 */
const LAYERS = [
  { name: 'Angular', query: '', scope: '' },
  { name: 'React', query: '?framework=react', scope: 'app-react-host ' },
] as const;

async function openRtl(page: Page, path: string, query: string): Promise<void> {
  // `dir` goes into the served HTML itself, so it is there before any
  // component renders (an init script runs before the parser creates <html>)
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /<html(\s|>)/,
      '<html dir="rtl"$1',
    );
    await route.fulfill({ response, body });
  });
  await page.goto(`${path}${query}`);
  if (query) {
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
  }
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
}

async function box(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (b === null) throw new Error('element has no layout box');
  return b;
}

/** `true` when `a` sits to the right of `b` (centre to centre). */
async function rightOf(a: Locator, b: Locator): Promise<boolean> {
  const ba = await box(a);
  const bb = await box(b);
  return ba.x + ba.width / 2 > bb.x + bb.width / 2;
}

for (const layer of LAYERS) {
  test.describe(`RTL (${layer.name})`, () => {
    const s = layer.scope;

    test('grid: the first column is rightmost and ArrowLeft moves to the next column', async ({
      page,
    }) => {
      await openRtl(page, '/components/data-grid', layer.query);
      const grid = page.locator(`${s}.oge-grid`).first();
      await expect(grid.locator('.oge-row').first()).toBeVisible({
        timeout: 30_000,
      });
      const headers = grid.locator(
        '.oge-header-row > .oge-header-cell[data-colid]',
      );
      expect(await rightOf(headers.nth(0), headers.nth(1))).toBe(true);
      const first = grid.locator('[role="gridcell"][data-cell="0-0"]');
      const second = grid.locator('[role="gridcell"][data-cell="0-1"]');
      expect(await rightOf(first, second)).toBe(true);
      await first.click();
      await expect(first).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(second).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(first).toBeFocused();
    });

    test('tabs: the first tab is rightmost and ArrowLeft moves to the next tab', async ({
      page,
    }) => {
      await openRtl(page, '/components/tabs', layer.query);
      const strip = page.locator(`${s}[role="tablist"]`).first();
      await expect(strip).toBeVisible();
      const tabs = strip.getByRole('tab');
      expect(await rightOf(tabs.nth(0), tabs.nth(1))).toBe(true);
      await tabs.nth(0).click();
      await page.keyboard.press('ArrowLeft');
      await expect(tabs.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(tabs.nth(0)).toBeFocused();
    });

    test('menubar: the first item is rightmost and ArrowLeft moves to the next item', async ({
      page,
    }) => {
      await openRtl(page, '/components/menubar', layer.query);
      const bar = page.locator(`${s}[role="menubar"]`).first();
      await expect(bar).toBeVisible();
      const first = bar.locator('[role="menuitem"]').first();
      const second = bar.locator('[role="menuitem"]').nth(1);
      expect(await rightOf(first, second)).toBe(true);
      await first.focus();
      await page.keyboard.press('ArrowLeft');
      await expect(second).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(first).toBeFocused();
    });

    test('slider: the track fills from the right and ArrowLeft increases', async ({
      page,
    }) => {
      await openRtl(page, '/components/inputs/slider', layer.query);
      const thumb = page
        .locator(`app-demo-card:has(#getting-started) ${s}[role="slider"]`)
        .first();
      await expect(thumb).toBeVisible();
      await thumb.focus();
      const min = (await thumb.getAttribute('aria-valuemin')) ?? '0';
      const max = (await thumb.getAttribute('aria-valuemax')) ?? '100';
      await page.keyboard.press('Home');
      await expect(thumb).toHaveAttribute('aria-valuenow', min);
      const atMin = await box(thumb);
      await page.keyboard.press('End');
      await expect(thumb).toHaveAttribute('aria-valuenow', max);
      const atMax = await box(thumb);
      expect(atMax.x).toBeLessThan(atMin.x);
      await page.keyboard.press('Home');
      // wait for Home to land: reading straight away can still see End's value
      await expect(thumb).toHaveAttribute('aria-valuenow', min);
      const before = Number(await thumb.getAttribute('aria-valuenow'));
      await page.keyboard.press('ArrowLeft');
      await expect
        .poll(async () => Number(await thumb.getAttribute('aria-valuenow')))
        .toBeGreaterThan(before);
    });

    test('charts: the argument axis runs right-to-left from the page dir', async ({
      page,
    }) => {
      await openRtl(page, '/components/charts', layer.query);
      const chart = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-chart`)
        .first();
      const labels = chart.locator('.oge-chart-arg-label');
      await expect(labels).toHaveCount(4);
      await expect(labels.first()).toHaveText('Q1');
      expect(await rightOf(labels.first(), labels.last())).toBe(true);
    });

    test('scheduler: the first day column is rightmost and ArrowLeft moves to the next day', async ({
      page,
    }) => {
      await openRtl(page, '/components/scheduler', layer.query);
      const scheduler = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-scheduler`)
        .first();
      const headers = scheduler.locator(
        '.oge-scheduler-header-row .oge-scheduler-date-header',
      );
      await expect(headers.nth(1)).toBeVisible();
      expect(await rightOf(headers.nth(0), headers.nth(1))).toBe(true);

      const cell = scheduler.locator('.oge-scheduler-cell[tabindex="0"]');
      const startBox = await box(cell);
      const startLabel = await cell.getAttribute('aria-label');
      await cell.focus();
      await page.keyboard.press('ArrowLeft');
      const moved = scheduler.locator('.oge-scheduler-cell[tabindex="0"]');
      await expect(moved).not.toHaveAttribute('aria-label', startLabel ?? '');
      await expect(moved).toBeFocused();
      const movedBox = await box(moved);
      expect(movedBox.x).toBeLessThan(startBox.x);
      await page.keyboard.press('ArrowRight');
      await expect(
        scheduler.locator('.oge-scheduler-cell[tabindex="0"]'),
      ).toHaveAttribute('aria-label', startLabel ?? '');
    });

    test('gantt: the timeline runs right-to-left and the tree keys mirror', async ({
      page,
    }) => {
      await openRtl(page, '/components/gantt', layer.query);
      const gantt = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-gantt`)
        .first();
      await expect(gantt).toHaveClass(/oge-gantt-rtl/);
      const early = gantt.locator('.oge-gantt-bar[data-task-key="2"]');
      const later = gantt.locator('.oge-gantt-bar[data-task-key="3"]');
      await expect(later).toBeVisible();
      await gantt.scrollIntoViewIfNeeded();
      // measured without scrolling the bars themselves into view: that would
      // scroll the timeline horizontally between the two reads
      const earlyBox = await early.boundingBox();
      const laterBox = await later.boundingBox();
      if (earlyBox === null || laterBox === null) throw new Error('no bar box');
      // a later task ends further left
      expect(laterBox.x + laterBox.width).toBeLessThan(
        earlyBox.x + earlyBox.width,
      );
      expect(
        await rightOf(
          gantt.locator('.oge-gantt-pane'),
          gantt.locator('.oge-gantt-chart-scroll'),
        ),
      ).toBe(true);

      // ArrowRight collapses (towards the parent side), ArrowLeft expands
      const summary = gantt.locator('.oge-gantt-row').first();
      await expect(summary).toHaveAttribute('aria-expanded', 'true');
      await summary.click();
      await page.keyboard.press('ArrowRight');
      await expect(summary).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('ArrowLeft');
      await expect(summary).toHaveAttribute('aria-expanded', 'true');
    });

    test('gantt: the context menu opens towards the left and its back arrow is ArrowRight', async ({
      page,
    }) => {
      await openRtl(page, '/components/gantt', layer.query);
      const gantt = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-gantt`)
        .first();
      await expect(gantt).toHaveClass(/oge-gantt-rtl/);
      const row = gantt.locator('.oge-gantt-row').nth(1);
      const rowBox = await box(row);
      const clickX = 80;
      await row.click({ button: 'right', position: { x: clickX, y: 10 } });
      const menu = gantt.locator('.oge-gantt-menu');
      await expect(menu).toBeVisible();
      // the menu's inline-start (right) edge sits at the pointer
      await expect
        .poll(async () => {
          const menuBox = await menu.boundingBox();
          return menuBox === null
            ? Number.NaN
            : Math.abs(menuBox.x + menuBox.width - (rowBox.x + clickX));
        })
        .toBeLessThanOrEqual(2);

      const items = menu.locator('.oge-gantt-menu-item:not(:disabled)');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      // ArrowLeft points away from the row in RTL: the menu stays
      await page.keyboard.press('ArrowLeft');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(menu).toBeHidden();
      await expect(gantt.locator('[data-focus-target]')).toBeFocused();
    });

    test('gantt: the PNG export of an RTL chart is mirrored', async ({
      page,
    }) => {
      // record every canvas text draw: [text, x, textAlign, canvas width]
      await page.addInitScript(() => {
        const calls: [string, number, string, number][] = [];
        (window as unknown as { __ganttText: typeof calls }).__ganttText =
          calls;
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (
          this: CanvasRenderingContext2D,
          text: string,
          x: number,
          y: number,
          maxWidth?: number,
        ) {
          // titles are the only draws with a max width
          if (maxWidth !== undefined) {
            calls.push([text, x, this.textAlign, this.canvas.width]);
          }
          return maxWidth === undefined
            ? fillText.call(this, text, x, y)
            : fillText.call(this, text, x, y, maxWidth);
        };
      });
      await openRtl(page, '/components/gantt', layer.query);
      const card = page.locator('app-demo-card', {
        hasText: 'Work calendar, teams & export',
      });
      await expect(card.locator(`${s}.oge-gantt`)).toHaveClass(/oge-gantt-rtl/);
      const download = page.waitForEvent('download');
      await card.getByRole('button', { name: 'Export PNG' }).click();
      await download;
      const titles = () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __ganttText: [string, number, string, number][];
              }
            ).__ganttText,
        );
      await expect.poll(async () => (await titles()).length).toBeGreaterThan(0);
      for (const [, x, align, width] of await titles()) {
        expect(align).toBe('right');
        // canvas width is CSS width × pixel ratio 2; titles sit in the right half
        expect(x).toBeGreaterThan(width / 4);
      }
    });

    test('kanban: the first column is rightmost and ArrowLeft moves into the next column', async ({
      page,
    }) => {
      await openRtl(page, '/components/kanban', layer.query);
      const board = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-kanban`)
        .first();
      const headers = board.locator('.oge-kanban-column-header');
      await expect(headers.nth(1)).toBeVisible();
      expect(await rightOf(headers.nth(0), headers.nth(1))).toBe(true);

      const columns = board.locator('.oge-kanban-cards[data-col]');
      const firstCol = await columns.nth(0).getAttribute('data-col');
      const secondCol = await columns.nth(1).getAttribute('data-col');
      const card = columns.nth(0).locator('.oge-kanban-card').first();
      await card.focus();
      const focusedColumn = () =>
        page.evaluate(
          () =>
            document.activeElement
              ?.closest('.oge-kanban-cards')
              ?.getAttribute('data-col') ?? null,
        );
      expect(await focusedColumn()).toBe(firstCol);
      await page.keyboard.press('ArrowLeft');
      await expect.poll(focusedColumn).toBe(secondCol);
      await page.keyboard.press('ArrowRight');
      await expect.poll(focusedColumn).toBe(firstCol);
    });

    test('pivot: row headers sit on the right and ArrowLeft moves to the next column', async ({
      page,
    }) => {
      await openRtl(page, '/components/pivot-grid', layer.query);
      const pivot = page.locator(`${s}.oge-pivot-grid`).first();
      const rowHeader = pivot
        .locator('.oge-pivot-row-header', { hasText: 'Europe' })
        .first();
      await expect(rowHeader).toBeVisible();
      const first = pivot.locator('[data-cell="0-0"]');
      const second = pivot.locator('[data-cell="0-1"]');
      expect(await rightOf(rowHeader, first)).toBe(true);
      expect(await rightOf(first, second)).toBe(true);
      await first.click();
      await expect(first).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(second).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(first).toBeFocused();
    });

    test('bpmn: the chrome mirrors (rail on the right, pad left of the shape); the canvas stays LTR', async ({
      page,
    }) => {
      await openRtl(page, '/components/bpmn', layer.query);
      const editor = page
        .locator(`app-demo-card:has(#getting-started) ${s}.oge-bpmn-editor`)
        .first();
      await editor.scrollIntoViewIfNeeded();
      const rail = editor.locator('.oge-bpmn-rail');
      const canvas = editor.locator('.oge-bpmn-canvas-wrap');
      expect(await rightOf(rail, canvas)).toBe(true);
      await expect(editor.locator('.oge-bpmn-canvas')).toHaveCSS(
        'direction',
        'ltr',
      );

      await editor.getByRole('button', { name: 'Task', exact: true }).click();
      await editor
        .locator('.oge-bpmn-canvas')
        .click({ position: { x: 320, y: 200 } });
      const shape = editor.locator('.oge-bpmn-shape').first();
      await expect(shape).toBeVisible();
      const pad = editor.locator('.oge-bpmn-context-pad');
      await expect(pad).toBeVisible();
      const padBox = await box(pad);
      const shapeBox = await box(shape);
      expect(padBox.x + padBox.width).toBeLessThanOrEqual(shapeBox.x + 1);
    });
  });
}
