import { test, expect } from '@playwright/test';

test('pivot grid renders totals, expands both axes and re-pivots via drag', async ({ page }) => {
  await page.goto('/components/pivot-grid');
  const pivot = page.locator('oge-pivot-grid');
  await expect(pivot.locator('.oge-pivot-row-header').first()).toBeVisible();

  // collapsed roots + grand total lines
  await expect(pivot.locator('.oge-pivot-row-header', { hasText: 'Grand Total' })).toBeVisible();
  await expect(pivot.locator('.oge-pivot-col-header', { hasText: 'Grand Total' })).toBeVisible();
  const collapsedRows = await pivot.locator('.oge-pivot-row-header').count();

  // expanding a region keeps its line (with subtotals) and adds countries
  await pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }).click();
  await expect(pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' })).toBeVisible();
  expect(await pivot.locator('.oge-pivot-row-header').count()).toBeGreaterThan(collapsedRows);
  // the expanded parent line is highlighted as a total line
  await expect(
    pivot.locator('.oge-pivot-row-header.oge-pivot-total', { hasText: 'Europe' })
  ).toBeVisible();

  // collapse again from the same line
  await pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }).first().click();
  await expect(pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' })).toHaveCount(0);

  // field panel is present with all four areas
  await expect(pivot.locator('.oge-pivot-area')).toHaveCount(4);
  await expect(pivot.locator('.oge-pivot-field-chip', { hasText: 'Region' })).toBeVisible();
});
