import { test, expect } from '@playwright/test';

test('checkbox selection with select-all and context menu', async ({ page }) => {
  await page.goto('/components/data-grid/selection');
  // first grid = the main checkbox demo (the deferred demo follows it)
  const grid = page.locator('oge-grid').first();
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // single checkbox
  await grid.locator('.oge-cell.oge-checkbox-cell input').nth(1).click();
  await expect(page.getByText('Selected:')).toContainText('1');
  await expect(grid.locator('.oge-row-selected')).toHaveCount(1);

  // select-all works on the whole (virtualized, filtered) data set
  await grid.locator('.oge-header-cell.oge-checkbox-cell input').click();
  await expect(page.getByText('Selected:')).toContainText('1000');

  await grid.locator('.oge-header-cell.oge-checkbox-cell input').click();
  await expect(page.getByText('Selected:')).toContainText('0');

  // context menu: right-click and run an item
  await grid.locator('.oge-row').nth(2).click({ button: 'right' });
  const menu = page.locator('.oge-context-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.oge-menu-item').nth(2)).toBeDisabled();
  await menu.locator('.oge-menu-item', { hasText: 'Select this row only' }).click();
  await expect(page.locator('.oge-context-menu')).toHaveCount(0);
  await expect(page.getByText('Selected:')).toContainText('1');
});

test('keyboard navigation moves the focused cell and selects with Space', async ({ page }) => {
  await page.goto('/components/data-grid/selection');
  const grid = page.locator('oge-grid').first();
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // focus the first data cell (in checkbox mode this also toggles row 1) …
  await grid.locator('[data-cell="0-0"]').click();
  await expect(page.getByText('Selected:')).toContainText('1');

  // …then walk with arrows and add row 3 with Space
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.['cell']))
    .toBe('2-1');

  await page.keyboard.press(' ');
  await expect(page.getByText('Selected:')).toContainText('2');
});
