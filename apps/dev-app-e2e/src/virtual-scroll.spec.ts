import { test, expect } from '@playwright/test';

test('virtualizes 100k rows and shows the right slice at arbitrary positions', async ({ page }) => {
  await page.goto('/components/data-grid/virtual-scroll');
  const grid = page.locator('oge-grid').first();

  // only a small window of the 100k rows is in the DOM
  await expect(grid.locator('.oge-row').first()).toBeVisible();
  const initialCount = await grid.locator('.oge-row').count();
  expect(initialCount).toBeLessThan(40);
  await expect(grid.locator('.oge-row').first().locator('.oge-cell').first()).toHaveText('1');

  // jump to an arbitrary scroll offset: row 50_000 at 36px rows
  await grid.locator('.oge-viewport').evaluate((el) => (el.scrollTop = 49_999 * 36));
  await expect
    .poll(async () =>
      (await grid.locator('.oge-row > .oge-cell:first-child').allTextContents()).map((t) => t.trim())
    )
    .toContain('50000');
  const midCount = await grid.locator('.oge-row').count();
  expect(midCount).toBeLessThan(40);

  // jump to the very end
  await grid.locator('.oge-viewport').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(grid.locator('.oge-row').last().locator('.oge-cell').first()).toHaveText('100000');
});

test('measures variable row heights and stays consistent while scrolling', async ({ page }) => {
  await page.goto('/components/data-grid/virtual-scroll');
  const grid = page.locator('oge-grid').nth(2);
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // wrapped bodies produce genuinely different row heights
  const heights = await grid
    .locator('.oge-row')
    .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).offsetHeight));
  expect(new Set(heights).size).toBeGreaterThan(1);

  // jump to the very end: as unmeasured rows settle the total height grows,
  // so keep pushing to the bottom until the measured tree lands on the last row
  await expect
    .poll(async () => {
      await grid.locator('.oge-viewport').evaluate((el) => (el.scrollTop = el.scrollHeight));
      return (await grid.locator('.oge-row').last().locator('.oge-cell').first().textContent())?.trim();
    })
    .toBe('5000');

  // and rows never overlap: each row starts where the previous one ends
  const rects = await grid
    .locator('.oge-row')
    .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().top));
  const sorted = [...rects].sort((a, b) => a - b);
  expect(rects).toEqual(sorted);
});

test('virtualizes 200 columns under horizontal scrolling', async ({ page }) => {
  await page.goto('/components/data-grid/virtual-scroll');
  const grid = page.locator('oge-grid').nth(1);
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // only a fraction of the 200 columns is rendered, spacers cover the rest
  const headers = grid.locator('.oge-header-cell:not(.oge-col-spacer)');
  expect(await headers.count()).toBeLessThan(60);
  await expect(headers.first()).toHaveText('C0');

  // scroll far right: the window shifts, C0 leaves the DOM
  await grid.locator('.oge-viewport').evaluate((el) => (el.scrollLeft = 10_000));
  await expect
    .poll(async () => (await headers.first().textContent())?.trim())
    .not.toBe('C0');
  expect(await headers.count()).toBeLessThan(60);

  // cell content still matches its absolute column
  const firstCell = grid.locator('.oge-row').first().locator('.oge-cell:not(.oge-col-spacer)').first();
  const colIndex = Number((await firstCell.getAttribute('data-cell'))?.split('-')[1]);
  await expect(firstCell).toHaveText(`R1 · C${colIndex}`);
});
