import { test, expect } from '@playwright/test';

test('pushed updates patch grid cells in place', async ({ page }) => {
  await page.goto('/components/data-grid/live-updates');
  const grid = page.locator('oge-grid');
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // salaries keep changing as the ticker pushes updates
  const salaries = grid.locator('.oge-row .oge-cell:nth-child(5)');
  const before = await salaries.allTextContents();
  await expect
    .poll(async () => (await salaries.allTextContents()).join('|'), { timeout: 10_000 })
    .not.toBe(before.join('|'));

  // rows themselves stay put: same keys, same order (updates only, no reload)
  const idsAfter = await grid.locator('.oge-row .oge-cell:first-child').allTextContents();
  expect(idsAfter.map((t) => t.trim())).toEqual(
    Array.from({ length: idsAfter.length }, (_, i) => String(i + 1))
  );
});
