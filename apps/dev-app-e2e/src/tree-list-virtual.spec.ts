import { expect, test } from '@playwright/test';

test('virtualizes a 100k-node tree and shows the right slice at arbitrary positions', async ({
  page,
}) => {
  await page.goto('/components/tree-list/virtual-scroll');
  const tree = page.locator('oge-tree-list');
  const viewport = tree.locator('.oge-viewport');

  // only a window of rows is in the DOM
  await expect(tree.locator('.oge-row').first()).toBeVisible();
  const domRows = await tree.locator('.oge-row').count();
  expect(domRows).toBeLessThan(120);

  // jump deep into the virtual space; rendered indices follow
  await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
  await expect
    .poll(async () => {
      const first = await tree
        .locator('.oge-row')
        .first()
        .getAttribute('data-rowindex');
      return Number(first);
    })
    .toBeGreaterThan(40_000);

  // scroll to the very end: the tail of the 100k space renders
  await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect
    .poll(async () => {
      const last = await tree
        .locator('.oge-row')
        .last()
        .getAttribute('data-rowindex');
      return Number(last);
    })
    .toBe(99_999);
});
