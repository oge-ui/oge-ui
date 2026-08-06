import { test, expect } from '@playwright/test';

test('row and header context menus open with custom items', async ({ page }) => {
  await page.goto('/components/data-grid/context-menu');
  const rowGrid = page.locator('oge-grid').first();
  await expect(rowGrid.locator('.oge-row').first()).toBeVisible();

  // row menu: custom items, disabled entry, action feedback
  await rowGrid.locator('.oge-row').first().click({ button: 'right' });
  const menu = page.locator('.oge-context-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.oge-menu-item', { hasText: 'Delete (no permission)' })).toBeDisabled();
  await menu.locator('.oge-menu-item', { hasText: 'Duplicate' }).click();
  await expect(page.locator('.oge-context-menu')).toHaveCount(0);
  await expect(page.getByText('duplicate #').first()).toBeVisible();

  // header menu: built-ins plus the injected custom item; Salary loses pins
  const headerGrid = page.locator('oge-grid').nth(1);
  await headerGrid.locator('.oge-header-cell', { hasText: 'Salary' }).click({ button: 'right' });
  await expect(menu).toBeVisible();
  await expect(menu.locator('.oge-menu-item', { hasText: 'Say hello to Salary' })).toBeVisible();
  await expect(menu.locator('.oge-menu-item', { hasText: 'Pin left' })).toHaveCount(0);

  // Escape closes it
  await page.keyboard.press('Escape');
  await expect(page.locator('.oge-context-menu')).toHaveCount(0);
});
