import { test, expect } from '@playwright/test';

test('root shows the landing page and the data grid overview renders rows', async ({
  page,
}) => {
  await page.goto('/');
  // The landing page copy is still being iterated on — assert structure only.
  await expect(page.locator('h1').first()).toBeVisible();

  await page.goto('/components/data-grid');
  await expect(page.locator('oge-grid')).toBeVisible();
  await expect(page.locator('.oge-header-cell').first()).toHaveText('Id');
  await expect(page.locator('.oge-row')).toHaveCount(50);
});
