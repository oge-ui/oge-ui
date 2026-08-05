import { test, expect } from '@playwright/test';

test('root redirects to the docs and the data grid overview renders rows', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/getting-started/);
  await expect(page.locator('h1')).toContainText('UI components for Angular');

  // both the Data Grid and Tree List sections have an "Overview" link
  await page.getByRole('link', { name: 'Overview' }).first().click();
  await expect(page).toHaveURL(/components\/data-grid/);
  await expect(page.locator('oge-grid')).toBeVisible();
  await expect(page.locator('.oge-header-cell').first()).toHaveText('Id');
  await expect(page.locator('.oge-row')).toHaveCount(50);
});
