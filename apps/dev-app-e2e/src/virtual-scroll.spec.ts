import { test, expect } from '@playwright/test';

test('virtualizes 100k rows and shows the right slice at arbitrary positions', async ({ page }) => {
  await page.goto('/components/data-grid/virtual-scroll');

  // only a small window of the 100k rows is in the DOM
  await expect(page.locator('.oge-row').first()).toBeVisible();
  const initialCount = await page.locator('.oge-row').count();
  expect(initialCount).toBeLessThan(40);
  await expect(page.locator('.oge-row').first().locator('.oge-cell').first()).toHaveText('1');

  // jump to an arbitrary scroll offset: row 50_000 at 36px rows
  await page.locator('.oge-viewport').evaluate((el) => (el.scrollTop = 49_999 * 36));
  await expect
    .poll(async () =>
      (await page.locator('.oge-row > .oge-cell:first-child').allTextContents()).map((t) => t.trim())
    )
    .toContain('50000');
  const midCount = await page.locator('.oge-row').count();
  expect(midCount).toBeLessThan(40);

  // jump to the very end
  await page.locator('.oge-viewport').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(page.locator('.oge-row').last().locator('.oge-cell').first()).toHaveText('100000');
});
