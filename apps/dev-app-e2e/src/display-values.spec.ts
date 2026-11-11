import { expect, test, type Page } from '@playwright/test';

/**
 * Display values, locale sorting, versioned state and rows dragged out of the
 * grid, in both render layers.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const columnTexts = async (page: Page, grid: string, index: number) =>
  page
    .locator(`${grid} .oge-rows .oge-row`)
    .evaluateAll(
      (rows, col) =>
        rows.map(
          (row) =>
            row
              .querySelectorAll('.oge-cell:not(.oge-drag-cell)')
              [col]?.textContent?.trim() ?? '',
        ),
      index,
    );

for (const fw of FRAMEWORKS) {
  test.describe(`grid display values (${fw.name})`, () => {
    test('searches lookup labels and sorts Turkish text', async ({ page }) => {
      await page.goto(`/components/data-grid/filtering${fw.query}`);
      const grid = page.locator('.demo-display-values').first();
      await grid.scrollIntoViewIfNeeded();
      await grid.locator('.oge-search-input').fill('leave');
      await expect
        .poll(async () => [
          ...new Set(await columnTexts(page, '.demo-display-values', 1)),
        ])
        .toEqual(['On leave']);

      await grid.locator('.oge-search-input').fill('');
      await grid.locator('.oge-header-cell[data-colid="city"]').click();
      await expect
        .poll(async () =>
          (await columnTexts(page, '.demo-display-values', 2)).slice(0, 1),
        )
        .toEqual(['Ankara']);
      const cities = await columnTexts(page, '.demo-display-values', 2);
      const order = [...new Set(cities)];
      // dotless I before dotted İ (an English sort puts İnegöl first)
      expect(order.indexOf('Isparta')).toBeGreaterThan(-1);
      expect(order.indexOf('Isparta')).toBeLessThan(order.indexOf('İnegöl'));
    });

    test('upgrades an old snapshot', async ({ page }) => {
      await page.goto(`/components/data-grid/persistence${fw.query}`);
      const button = page.locator('.demo-apply-old-state').first();
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await expect(button.locator('xpath=..')).toContainText(
        'version 1 · sort [{"field":"department","dir":"desc"}]',
      );
    });

    test('drags rows out as text', async ({ page }) => {
      await page.goto(`/components/data-grid/rows${fw.query}`);
      const grid = page.locator('.demo-drag-out').first();
      await grid.scrollIntoViewIfNeeded();
      const handle = grid.locator('.oge-row .oge-drag-handle').first();
      await expect(handle).toHaveAttribute('draggable', 'true');
      const text = await handle.evaluate((el) => {
        const transfer = new DataTransfer();
        el.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        );
        return [
          transfer.getData('text/plain'),
          transfer.getData('text/uri-list'),
        ];
      });
      expect(text[0].split('\r\n')[0]).toBe('Id\tFirst Name\tDepartment');
      expect(text[1]).toMatch(/^https:\/\/example\.com\/employees\/\d+$/);
    });
  });
}
