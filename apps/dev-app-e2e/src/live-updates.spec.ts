import { test, expect } from '@playwright/test';

test('pushed updates patch grid cells in place and flash them', async ({
  page,
}) => {
  await page.goto('/components/data-grid/live-updates');
  const grid = page.locator('oge-grid');
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // prices keep changing as the ticker pushes updates
  const prices = grid.locator('.oge-row .oge-cell:nth-child(3)');
  const before = await prices.allTextContents();
  await expect
    .poll(async () => (await prices.allTextContents()).join('|'), {
      timeout: 10_000,
    })
    .not.toBe(before.join('|'));

  // highlightChanges flashes the patched cells
  await expect
    .poll(
      async () => grid.locator('.oge-cell-flash-a, .oge-cell-flash-b').count(),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  // rows themselves stay put: same symbols, same order (updates only, no reload)
  const symbols = await grid
    .locator('.oge-row .oge-cell:first-child')
    .allTextContents();
  expect(symbols[0].trim()).toBe('AAPL');
  expect(symbols).toHaveLength(12);
});
