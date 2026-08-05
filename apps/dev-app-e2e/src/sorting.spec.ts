import { test, expect } from '@playwright/test';

test('sorts by header click and pages through 10k rows', async ({ page }) => {
  await page.goto('/components/data-grid/sorting');

  // paging: first page has 15 rows
  await expect(page.locator('.oge-row')).toHaveCount(15);

  // sort by Id descending (two clicks)
  const idHeader = page.locator('.oge-header-cell').first();
  await idHeader.click();
  await idHeader.click();
  await expect(idHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(page.locator('.oge-row').first().locator('.oge-cell').first()).toHaveText('10000');

  // next page keeps the sort
  await page.getByLabel('Next page').click();
  await expect(page.locator('.oge-row').first().locator('.oge-cell').first()).toHaveText('9985');
});
