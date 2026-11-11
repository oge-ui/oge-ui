import { expect, test, type Page } from '@playwright/test';

/**
 * Grid filter chips and the column summary menu, in both render layers: a
 * filter-row entry becomes a chip, its × removes it and empties the editor,
 * the header menu's Summary submenu changes the total row, and the city value
 * list carries one "(Blank)" item.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const demo = (page: Page) => page.locator('.demo-filter-chips').first();

for (const fw of FRAMEWORKS) {
  test.describe(`grid filter chips and summaries (${fw.name})`, () => {
    test('a filter becomes a removable chip', async ({ page }) => {
      await page.goto(`/components/data-grid/filtering${fw.query}`);
      const grid = demo(page);
      await grid.scrollIntoViewIfNeeded();
      const editor = grid.locator('.oge-filter-cell input').first();
      await editor.fill('a');
      const chips = grid.getByRole('group', { name: 'Active filters' });
      await expect(chips.locator('.oge-filter-chip')).toHaveCount(1);
      await expect(chips).toContainText('First Name ·');
      await chips
        .getByRole('button', { name: /^Remove filter: First Name/ })
        .click();
      await expect(chips).toHaveCount(0);
      await expect(editor).toHaveValue('');
    });

    test('the header menu picks the column total', async ({ page }) => {
      await page.goto(`/components/data-grid/filtering${fw.query}`);
      const grid = demo(page);
      await grid.scrollIntoViewIfNeeded();
      const total = grid.locator('.oge-total-cell').filter({ hasText: /:/ });
      await expect(total.first()).toContainText('Sum:');
      await grid
        .locator('.oge-header-cell', { hasText: 'Salary' })
        .click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Summary' }).click();
      await page.getByRole('menuitemradio', { name: 'Max' }).click();
      await expect(total.first()).toContainText('Max:');
    });

    test('blank cities list as one "(Blank)" item', async ({ page }) => {
      await page.goto(`/components/data-grid/filtering${fw.query}`);
      const grid = demo(page);
      await grid.scrollIntoViewIfNeeded();
      await grid.locator('.oge-header-filter-btn').nth(1).click();
      const popup = page.locator('.oge-header-filter-popup');
      await expect(
        popup.locator('.oge-hf-item', { hasText: '(Blank)' }),
      ).toHaveCount(1);
    });
  });
}
