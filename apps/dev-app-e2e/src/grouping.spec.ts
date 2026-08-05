import { test, expect } from '@playwright/test';

test('groups rows, collapses a group and shows summaries', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  const grid = page.locator('oge-grid').first();

  // pre-grouped by department via [groupBy]
  await expect(grid.locator('.oge-group-chip')).toHaveText(/Department/);
  const groupRows = grid.locator('.oge-group-row');
  await expect(groupRows.first()).toBeVisible();
  await expect(groupRows.first()).toContainText('Department:');
  await expect(groupRows.first()).toContainText('Avg of Salary:');

  // total summary row
  await expect(grid.locator('.oge-total-cell', { hasText: 'Sum:' })).toBeVisible();

  // collapsing the first group removes its child rows
  const before = await grid.locator('.oge-row').count();
  await groupRows.first().click();
  await expect(grid.locator('.oge-group-row').first()).toHaveAttribute('aria-expanded', 'false');
  const after = await grid.locator('.oge-row').count();
  expect(after).toBeLessThan(before);

  // drag the City header into the group panel → second-level grouping
  await grid
    .locator('.oge-header-cell', { hasText: 'City' })
    .dragTo(grid.locator('.oge-group-panel'));
  await expect(grid.locator('.oge-group-chip')).toHaveCount(2);
});

test('deferred groups fetch children only on expand', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  const grid = page.locator('oge-grid').nth(1);

  // groups render collapsed from a headers-only payload
  await expect(grid.locator('.oge-group-row').first()).toBeVisible();
  await expect(grid.locator('.oge-row')).toHaveCount(0);

  // expanding shows a loading skeleton, then the fetched rows
  await grid.locator('.oge-group-row').first().click();
  await expect(grid.locator('.oge-filler-row')).toHaveCount(1);
  await expect(grid.locator('.oge-row').first()).toBeVisible({ timeout: 5000 });
  await expect(grid.locator('.oge-filler-row')).toHaveCount(0);
  const count = await grid.locator('.oge-row').count();
  expect(count).toBeGreaterThan(0);

  // collapsing hides them again without dropping the other groups
  await grid.locator('.oge-group-row').first().click();
  await expect(grid.locator('.oge-row')).toHaveCount(0);
});

test('column chooser toggles column visibility', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  const grid = page.locator('oge-grid').first();
  await expect(grid.locator('.oge-header-cell', { hasText: 'City' })).toBeVisible();

  await grid.getByLabel('Column chooser').click();
  await grid.locator('.oge-chooser-popup label', { hasText: 'City' }).click();
  await expect(grid.locator('.oge-header-cell', { hasText: 'City' })).toHaveCount(0);
});
