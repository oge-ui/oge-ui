import { expect, test, type Page } from '@playwright/test';

/**
 * Grid filter tools in both render layers: automatic value lists, a custom
 * filter cell, manual apply, quick dates and saved views.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const demo = (page: Page) => page.locator('.demo-filter-tools').first();

for (const fw of FRAMEWORKS) {
  test.describe(`grid filter tools (${fw.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/data-grid/filtering${fw.query}`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await demo(page).scrollIntoViewIfNeeded();
    });

    // Salary (90 values over 80 rows) gets none; first names repeat in the demo data
    test('lists values only on repetitive columns', async ({ page }) => {
      const funnels = demo(page)
        .locator('.oge-header-cell')
        .filter({ has: page.locator('.oge-header-filter-btn') });
      await expect(funnels).toHaveText([
        /First Name/,
        /Department/,
        /City/,
        /Hired/,
      ]);
    });

    test('holds a custom-cell edit until applied', async ({ page }) => {
      const grid = demo(page);
      const rows = grid.locator('.oge-row');
      const before = await grid
        .locator('.oge-pager-info, .oge-pager')
        .first()
        .textContent();
      await grid.getByLabel('Filter Department').selectOption({ index: 1 });
      await expect(grid.locator('.oge-filter-apply-note')).toHaveText(
        'Filter changes are not applied yet',
      );
      await expect(
        grid.locator('.oge-pager-info, .oge-pager').first(),
      ).toHaveText(before ?? '');
      await grid.getByRole('button', { name: 'Apply filters' }).click();
      await expect(grid.locator('.oge-filter-apply-note')).toHaveText('');
      await expect(rows.first()).toBeVisible();
    });

    test('saves and reopens a view', async ({ page }) => {
      const grid = demo(page);
      await grid.getByRole('button', { name: 'Views' }).click();
      const dialog = page.getByRole('dialog', { name: 'Views' });
      await expect(dialog).toContainText('No saved views yet');
      await dialog.getByLabel('View name').fill('Mine');
      await dialog.getByRole('button', { name: 'Save view' }).click();
      await expect(
        dialog.getByRole('button', { name: 'Mine', exact: true }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete view Mine' }).click();
      await expect(dialog).toContainText('No saved views yet');
    });

    test('offers quick dates on the date column', async ({ page }) => {
      const grid = demo(page);
      await grid
        .locator('.oge-header-cell', { hasText: 'Hired' })
        .locator('.oge-header-filter-btn')
        .click();
      const presets = page.getByRole('group', { name: 'Quick dates' });
      await expect(presets.getByRole('button')).toHaveCount(6);
      await presets.getByRole('button', { name: 'This year' }).click();
      await expect(grid.locator('.oge-filter-apply-note')).toHaveText(
        'Filter changes are not applied yet',
      );
    });
  });
}
