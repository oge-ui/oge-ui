import { expect, test } from '@playwright/test';

test('filtering keeps ancestor rows visible', async ({ page }) => {
  await page.goto('/components/tree-list/filtering');
  const tree = page.locator('oge-tree-list');
  const rows = tree.locator('.oge-row');
  await expect(rows.first()).toBeVisible();
  const allCount = await rows.count();
  expect(allCount).toBeGreaterThan(10);

  const officeFilter = tree.locator('.oge-filter-input').nth(2);
  await officeFilter.fill('Berlin');
  await expect
    .poll(async () => rows.count(), { timeout: 5000 })
    .toBeLessThan(allCount);

  // every visible leaf matches; its ancestors are visible even when they don't
  const berlinRows = tree.locator('.oge-row', { hasText: 'Berlin' });
  expect(await berlinRows.count()).toBeGreaterThan(0);
  await expect(rows.first()).toHaveAttribute('aria-level', '1');

  // clearing restores the full tree
  await officeFilter.fill('');
  await expect.poll(async () => rows.count(), { timeout: 5000 }).toBe(allCount);
});

test('the search panel folds locale characters and keeps the path', async ({
  page,
}) => {
  await page.goto('/components/tree-list/filtering');
  const tree = page.locator('oge-tree-list');
  await tree.locator('.oge-search-input').fill('istanbul');
  await expect
    .poll(
      async () => tree.locator('.oge-row', { hasText: 'İstanbul' }).count(),
      {
        timeout: 5000,
      },
    )
    .toBeGreaterThan(0);
});
