import { test, expect } from '@playwright/test';

test('remote virtual scrolling loads sparse blocks over 1M rows', async ({
  page,
}) => {
  await page.goto('/components/data-grid/infinite-scroll');
  const grid = page.locator('oge-grid');

  // first block arrives after the simulated latency
  await expect(
    grid.locator('.oge-row:not(.oge-filler-row)').first(),
  ).toBeVisible();
  await expect(grid.locator('.oge-cell').first()).toHaveText('1');

  // the spacer spans far more than the loaded rows, but stays inside what
  // every engine lays out (1M × 36px is past Firefox's ~17.9M px cap, which
  // used to collapse the body to its rendered rows): the browser's own
  // scroll range must match the spacer
  const sizes = await grid.locator('.oge-viewport').evaluate((el) => ({
    spacer: (el.querySelector('.oge-body') as HTMLElement).offsetHeight,
    scroll: el.scrollHeight,
  }));
  expect(sizes.spacer).toBeGreaterThan(10_000_000);
  expect(sizes.scroll).toBeGreaterThanOrEqual(sizes.spacer);

  // jump straight to the middle — skeleton fillers render while the block
  // loads. They are transient (gone once the block lands) and WebKit's first
  // frame after a 16M px jump can outlast the simulated latency, so a
  // MutationObserver records them as they are inserted instead of the test
  // sampling the DOM and stepping over the whole window.
  const sawFillers = await grid.locator('.oge-viewport').evaluate(
    (el) =>
      new Promise<boolean>((resolve) => {
        const root = el.closest('oge-grid') ?? el;
        const done = (seen: boolean) => {
          observer.disconnect();
          clearTimeout(timer);
          resolve(seen);
        };
        // the inserted nodes themselves, not the DOM at callback time: a
        // filler added and replaced within one task is still a filler shown
        const observer = new MutationObserver((records) => {
          const added = records.flatMap((record) => [...record.addedNodes]);
          if (
            added.some(
              (node) =>
                node instanceof Element &&
                (node.matches('.oge-filler-row') ||
                  !!node.querySelector('.oge-filler-row')),
            )
          ) {
            done(true);
          }
        });
        const timer = setTimeout(() => done(false), 5000);
        observer.observe(root, { childList: true, subtree: true });
        el.scrollTop = el.scrollHeight / 2;
      }),
  );
  expect(sawFillers).toBe(true);

  // then the real mid-list rows replace them
  await expect(grid.locator('.oge-filler-row')).toHaveCount(0, {
    timeout: 10_000,
  });
  const firstId = await grid
    .locator('.oge-row:not(.oge-filler-row) .oge-cell')
    .first()
    .evaluate((el) => Number(el.textContent));
  expect(firstId).toBeGreaterThan(400_000);
  expect(firstId).toBeLessThan(600_000);

  // and the very last row is reachable (past 2^25 px it used to be clipped)
  await grid.locator('.oge-viewport').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    grid.locator('.oge-row:not(.oge-filler-row) .oge-cell', {
      hasText: /^\s*1000000\s*$/,
    }),
  ).toBeVisible({ timeout: 10_000 });
});
