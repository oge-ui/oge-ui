import { test, expect } from '@playwright/test';

test('remote virtual scrolling loads sparse blocks over 1M rows', async ({ page }) => {
  await page.goto('/components/data-grid/infinite-scroll');
  const grid = page.locator('oge-grid');

  // first block arrives after the simulated latency
  await expect(grid.locator('.oge-row:not(.oge-filler-row)').first()).toBeVisible();
  await expect(grid.locator('.oge-cell').first()).toHaveText('1');

  // the spacer reflects the full 1M-row total, not just the loaded rows
  const bodyHeight = await grid
    .locator('.oge-body')
    .evaluate((el) => parseFloat((el as HTMLElement).style.height)); // Chrome serializes as "3e+07px"
  expect(bodyHeight).toBeGreaterThan(30_000_000);

  // jump straight to the middle — skeleton fillers render while the block loads
  await grid.locator('.oge-viewport').evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2;
  });
  await expect
    .poll(async () => grid.locator('.oge-filler-row').count(), { timeout: 5000 })
    .toBeGreaterThan(0);

  // then the real mid-list rows replace them
  await expect(grid.locator('.oge-filler-row')).toHaveCount(0, { timeout: 10_000 });
  const firstId = await grid
    .locator('.oge-row:not(.oge-filler-row) .oge-cell')
    .first()
    .evaluate((el) => Number(el.textContent));
  expect(firstId).toBeGreaterThan(400_000);
  expect(firstId).toBeLessThan(600_000);
});
