import { test, expect } from '@playwright/test';

test('groups rows, collapses a group and shows summaries', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');

  // pre-grouped by department via [groupBy]
  await expect(page.locator('.oge-group-chip')).toHaveText(/Department/);
  const groupRows = page.locator('.oge-group-row');
  await expect(groupRows.first()).toBeVisible();
  await expect(groupRows.first()).toContainText('Department:');
  await expect(groupRows.first()).toContainText('Avg of Salary:');

  // total summary row
  await expect(page.locator('.oge-total-cell', { hasText: 'Sum:' })).toBeVisible();

  // collapsing the first group removes its child rows
  const before = await page.locator('.oge-row').count();
  await groupRows.first().click();
  await expect(page.locator('.oge-group-row').first()).toHaveAttribute('aria-expanded', 'false');
  const after = await page.locator('.oge-row').count();
  expect(after).toBeLessThan(before);

  // drag the City header into the group panel → second-level grouping
  await page
    .locator('.oge-header-cell', { hasText: 'City' })
    .dragTo(page.locator('.oge-group-panel'));
  await expect(page.locator('.oge-group-chip')).toHaveCount(2);
});

test('column chooser toggles column visibility', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  await expect(page.locator('.oge-header-cell', { hasText: 'City' })).toBeVisible();

  await page.getByLabel('Column chooser').click();
  await page.locator('.oge-chooser-popup label', { hasText: 'City' }).click();
  await expect(page.locator('.oge-header-cell', { hasText: 'City' })).toHaveCount(0);
});
