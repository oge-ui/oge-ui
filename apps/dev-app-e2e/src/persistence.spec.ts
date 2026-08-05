import { test, expect } from '@playwright/test';

test('grid state survives a page reload via stateKey', async ({ page }) => {
  await page.goto('/components/data-grid/sorting');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // sort by Id descending
  const idHeader = page.locator('.oge-header-cell').first();
  await idHeader.click();
  await idHeader.click();
  await expect(idHeader).toHaveAttribute('aria-sort', 'descending');
  await page.waitForTimeout(400); // > save debounce

  await page.reload();
  await expect(page.locator('.oge-header-cell').first()).toHaveAttribute('aria-sort', 'descending');
  await expect(
    page.locator('.oge-row').first().locator('.oge-cell').first()
  ).toHaveText('10000');

  // cleanup for repeatable runs
  await page.evaluate(() => localStorage.removeItem('oge-grid:docs-sorting'));
});

test('header context menu sorts and pins', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  const cityHeader = page.locator('.oge-header-cell', { hasText: 'City' });
  await cityHeader.click({ button: 'right' });
  const menu = page.locator('.oge-context-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.oge-menu-item', { hasText: 'Group by this column' })).toBeVisible();

  await menu.locator('.oge-menu-item', { hasText: 'Sort descending' }).click();
  await expect(cityHeader).toHaveAttribute('aria-sort', 'descending');

  await cityHeader.click({ button: 'right' });
  await menu.locator('.oge-menu-item', { hasText: 'Pin left' }).click();
  await expect(cityHeader).toHaveClass(/oge-pinned/);
});
