import { test, expect } from '@playwright/test';

test('remote grid issues exactly one request per settled interaction', async ({ page }) => {
  await page.goto('/components/data-grid/remote-data');
  const log = page.locator('.request-log li');

  // initial load = 1 request
  await expect(page.locator('.oge-row').first()).toBeVisible();
  await expect(log).toHaveCount(1);

  // rapid typing → debounced into a single request, stale ones aborted
  await page.locator('.oge-search-input').pressSequentially('ali', { delay: 50 });
  await expect(log).toHaveCount(2);
  await expect(log.first()).toContainText('search="ali"');

  // one sort click → one request
  await page.locator('.oge-header-cell').nth(1).click();
  await expect(log).toHaveCount(3);
  await expect(log.first()).toContainText('sort=firstName asc');

  // page navigation → one request
  await page.getByLabel('Next page').click();
  await expect(log).toHaveCount(4);
  await expect(log.first()).toContainText('skip=12');
});
