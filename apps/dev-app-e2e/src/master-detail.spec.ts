import { test, expect } from '@playwright/test';

test('expands and collapses a master-detail row', async ({ page }) => {
  await page.goto('/components/data-grid/master-detail');

  await expect(page.locator('.oge-expander-btn').first()).toBeVisible();
  await expect(page.locator('.oge-detail-row')).toHaveCount(0);

  await page.locator('.oge-expander-btn').nth(1).click();
  const detail = page.locator('.oge-detail-row');
  await expect(detail).toHaveCount(1);
  await expect(detail).toContainText('Employee');
  await expect(detail).toContainText('Compensation');

  await page.locator('.oge-expander-btn').nth(1).click();
  await expect(page.locator('.oge-detail-row')).toHaveCount(0);
});
