import { expect, test } from '@playwright/test';

test('lazy tree loads children per expansion with a skeleton in between', async ({
  page,
}) => {
  await page.goto('/components/tree-list/lazy-loading');
  const tree = page.locator('oge-tree-list');

  // initial load: roots only, one request
  await expect(tree.locator('.oge-row').first()).toBeVisible();
  const requestLog = page.locator('ol li');
  await expect(requestLog).toHaveCount(1);
  await expect(requestLog.first()).toContainText('parentId eq null');

  // expanding fetches exactly one more level (skeleton while in flight)
  await tree.locator('.oge-tree-expander').first().click();
  await expect(tree.locator('.oge-filler-row')).toBeVisible();
  await expect(tree.locator('.oge-row[aria-level="2"]').first()).toBeVisible();
  await expect(tree.locator('.oge-filler-row')).toHaveCount(0);
  await expect(requestLog).toHaveCount(2);

  // collapse + re-expand serves from the cache: still two requests
  await tree.locator('.oge-tree-expander').first().click();
  await tree.locator('.oge-tree-expander').first().click();
  await expect(tree.locator('.oge-row[aria-level="2"]').first()).toBeVisible();
  await expect(requestLog).toHaveCount(2);
});
