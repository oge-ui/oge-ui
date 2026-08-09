import { test, expect } from '@playwright/test';

test('root shows the landing page and the data grid overview renders rows', async ({
  page,
}) => {
  await page.goto('/');
  // Structure only: landing copy changes freely without breaking e2e.
  await expect(page.locator('h1').first()).toBeVisible();

  await page.goto('/components/data-grid');
  await expect(page.locator('oge-grid')).toBeVisible();
  await expect(page.locator('.oge-header-cell').first()).toHaveText('Id');
  // The overview grid pages its 50 rows, so the page stays scannable.
  await expect(page.locator('.oge-row')).toHaveCount(10);
  await expect(page.locator('.oge-pager')).toBeVisible();
});
