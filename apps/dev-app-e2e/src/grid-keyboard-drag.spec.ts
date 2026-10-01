import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Keyboard alternatives to every grid drag gesture (WCAG 2.1.1 Keyboard,
 * 2.5.7 Dragging Movements): column resize, column reorder, row reorder,
 * group-panel chips and the column chooser — in both render layers, which
 * share the decisions in `@oge-ui/behavior`'s grid-keyboard-moves.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

function headerCells(grid: Locator): Locator {
  return grid.locator('.oge-header-row > .oge-header-cell[data-colid]');
}

async function colIds(grid: Locator): Promise<(string | null)[]> {
  return headerCells(grid).evaluateAll((cells) =>
    cells.map((cell) => cell.getAttribute('data-colid')),
  );
}

async function firstGrid(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const grid = page.locator('.oge-grid').first();
  await expect(grid.locator('.oge-row').first()).toBeVisible({
    timeout: 30_000,
  });
  return grid;
}

for (const fw of FRAMEWORKS) {
  test.describe(`${fw.name} grid keyboard drag alternatives`, () => {
    test('Alt+Arrow resizes the focused header; the handle is a separator', async ({
      page,
    }) => {
      const grid = await firstGrid(page, `/components/data-grid${fw.query}`);
      const header = headerCells(grid).nth(1);
      const handle = header.locator('.oge-resize-handle');
      await expect(handle).toHaveAttribute('role', 'separator');
      await expect(handle).toHaveAttribute('aria-orientation', 'vertical');
      await expect(handle).toHaveAttribute('aria-label', /^Resize /);
      const before = (await header.boundingBox())!.width;
      await header.focus();
      await header.press('Alt+ArrowRight');
      await expect
        .poll(async () => (await header.boundingBox())!.width)
        .toBeCloseTo(before + 10, 0);
      await expect(grid.locator('.oge-grid-announcer')).toContainText('pixels');
      // the page did not navigate back on Alt+ArrowLeft either
      await header.press('Alt+ArrowLeft');
      await expect(page).toHaveURL(/components\/data-grid/);
      await expect
        .poll(async () => (await header.boundingBox())!.width)
        .toBeCloseTo(before, 0);
      // the separator itself takes the APG window-splitter keys
      await handle.focus();
      await handle.press('Home');
      await expect(handle).toHaveAttribute(
        'aria-valuenow',
        (await handle.getAttribute('aria-valuemin'))!,
      );
      await handle.press('Escape');
      await expect(header).toBeFocused();
    });

    test('Ctrl+Shift+Arrow moves the focused column and announces it', async ({
      page,
    }) => {
      const grid = await firstGrid(page, `/components/data-grid${fw.query}`);
      const before = await colIds(grid);
      const header = headerCells(grid).nth(1);
      await header.focus();
      await header.press('Control+Shift+ArrowRight');
      await expect
        .poll(() => colIds(grid))
        .toEqual([before[0], before[2], before[1], ...before.slice(3)]);
      await expect(grid.locator('.oge-grid-announcer')).toContainText(
        'moved to position 3 of',
      );
      // focus stays on the moved header
      await expect(
        grid.locator(
          `.oge-header-row > .oge-header-cell[data-colid="${before[1]}"]`,
        ),
      ).toBeFocused();
    });

    test('Ctrl+ArrowDown moves the focused row through the drop path', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/rows${fw.query}`);
      const card = page
        .locator('app-demo-card')
        .filter({ has: page.locator('.oge-drag-handle') })
        .first();
      const grid = card.locator('.oge-grid');
      const rows = grid.locator('.oge-row');
      await expect(rows.first()).toBeVisible({ timeout: 30_000 });
      const cell = rows.first().locator('[data-cell]').first();
      const firstText = (await cell.innerText()).trim();
      await cell.click();
      await cell.press('Control+ArrowDown');
      await expect(rows.nth(1).locator('[data-cell]').first()).toHaveText(
        firstText,
      );
      await expect(grid.locator('.oge-grid-announcer')).toContainText(
        'Row moved to position 2 of',
      );
      // the same event the pointer drop fires (the demo prints it)
      await expect(card).toContainText('→ index 1');
      // focus followed the row
      await expect(rows.nth(1).locator('[data-cell]').first()).toBeFocused();
    });

    test('group by from the header menu, reorder and remove chips by keyboard', async ({
      page,
    }) => {
      const grid = await firstGrid(
        page,
        `/components/data-grid/grouping${fw.query}`,
      );
      const city = grid.locator(
        '.oge-header-row > .oge-header-cell[data-colid="city"]',
      );
      await city.focus();
      await city.press('Shift+F10');
      await page
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();
      const chips = grid.locator('.oge-group-chip');
      await expect(chips).toHaveCount(2);
      await expect(chips.nth(1)).toContainText('City');
      const cityChip = grid.locator(
        '.oge-group-chip-remove[data-group-field="city"]',
      );
      await cityChip.focus();
      await cityChip.press('Control+ArrowLeft');
      await expect(chips.nth(0)).toContainText('City');
      await expect(grid.locator('.oge-grid-announcer')).toContainText(
        'moved to position 1 of 2',
      );
      await expect(cityChip).toBeFocused();
      await cityChip.press('Delete');
      await expect(chips).toHaveCount(1);
      await expect(chips.first()).not.toContainText('City');
    });

    test('Ctrl+ArrowDown in the column chooser moves the column', async ({
      page,
    }) => {
      const grid = await firstGrid(
        page,
        `/components/data-grid/grouping${fw.query}`,
      );
      const before = await colIds(grid);
      await grid.locator('.oge-chooser-button').click();
      const item = page.locator(
        `.oge-chooser-item[data-chooser-id="${before[1]}"]`,
      );
      await item.locator('input').focus();
      await page.keyboard.press('Control+ArrowDown');
      await expect.poll(() => colIds(grid)).not.toEqual(before);
      const after = await colIds(grid);
      expect(after.indexOf(before[1])).toBe(2);
      await expect(item.locator('input')).toBeFocused();
    });
  });
}
