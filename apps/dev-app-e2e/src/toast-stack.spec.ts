import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Toast stack mode (`toastStacked`) in both render layers: the region is a
 * deck (cells numbered from the newest), hovering it expands it into a list
 * whose toasts no longer overlap, and a sideways swipe dismisses a toast.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

/** Waits until no stack transform is still gliding. */
async function still(locator: Locator): Promise<void> {
  let previous = '';
  await expect
    .poll(async () => {
      const boxes = JSON.stringify(
        await locator.evaluateAll((nodes) =>
          nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
        ),
      );
      const same = boxes === previous;
      previous = boxes;
      return same;
    })
    .toBe(true);
}

for (const fw of FRAMEWORKS) {
  test.describe(`toast stack mode (${fw.name})`, () => {
    test('a deck that expands on hover and a toast that swipes away', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/toast${fw.query}`);
      const demo = card(page, 'stack-mode');
      const sync = demo.getByRole('button', {
        name: 'Sync 4 folders',
        exact: true,
      });
      await sync.scrollIntoViewIfNeeded();
      await sync.click();

      const region = page.locator(
        '.oge-toast-region-stacked.oge-toast-region-bottom-end',
      );
      await expect(region).toBeVisible();
      const cells = region.locator(':scope > .oge-toast-cell');
      await expect(cells).toHaveCount(4);
      await expect(cells.nth(3)).toHaveAttribute(
        'style',
        /--oge-toast-depth: 0/,
      );
      await expect(cells.nth(0)).toHaveAttribute('data-oge-toast-buried', '');

      // collapsed: the toasts overlap
      const toasts = region.locator('.oge-toast');
      await still(toasts);
      const collapsedTops = await toasts.evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().top),
      );
      expect(
        Math.max(...collapsedTops) - Math.min(...collapsedTops),
      ).toBeLessThan(40);

      // hover: a list, every toast clear of the next
      await toasts.last().hover();
      await expect(region).toHaveClass(/oge-toast-region-expanded/);
      await still(toasts);
      const tops = await toasts.evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().top),
      );
      for (let i = 1; i < tops.length; i++) {
        expect(tops[i] - tops[i - 1]).toBeGreaterThan(30);
      }

      // swipe the front toast sideways
      const front = toasts.last();
      const box = (await front.boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + 40, y);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, y, { steps: 4 });
      await page.mouse.move(box.x + 160, y, { steps: 4 });
      await page.mouse.up();
      await expect(region.locator('.oge-toast-message')).toHaveCount(3);
      await expect(region.getByText('Sent synced')).toHaveCount(0);
    });
  });
}
