import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Tile layout — the dashboard contract in a real DOM, in both render layers:
 * the list / group semantics with one roving tab stop, Ctrl+Arrow moves and
 * Ctrl+Shift+Arrow resizes (the keyboard twins), the pointer drag and resize
 * running the same commit, Escape cancelling a drag, the serializable state
 * round trip and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const tile = (scope: Locator, name: string): Locator =>
  scope.getByRole('group', { name, exact: true });

const focusedTileKey = (page: Page) =>
  page.evaluate(
    () => document.activeElement?.getAttribute('data-oge-tile-key') ?? '',
  );

const tileKeys = (scope: Locator) =>
  scope
    .locator('.oge-tile-layout-tile')
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-oge-tile-key')),
    );

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 4, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

for (const fw of FRAMEWORKS) {
  test.describe(`tile layout (${fw.name})`, () => {
    test('renders a labelled list of tiles with one tab stop', async ({
      page,
    }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'dashboard-spans');
      const list = demo.getByRole('list', {
        name: 'Sales dashboard',
        exact: true,
      });
      await list.scrollIntoViewIfNeeded();
      await expect(list.getByRole('listitem')).toHaveCount(7);
      const revenue = tile(demo, 'Revenue');
      await expect(revenue).toHaveAttribute('aria-roledescription', 'tile');
      await expect(revenue).toHaveAttribute('tabindex', '0');
      await expect(tile(demo, 'Orders')).toHaveAttribute('tabindex', '-1');
      await expect(revenue).toHaveAttribute(
        'aria-keyshortcuts',
        /Control\+ArrowRight/,
      );

      await revenue.focus();
      await page.keyboard.press('ArrowRight');
      await expect(tile(demo, 'Orders')).toBeFocused();
      await page.keyboard.press('End');
      await expect(tile(demo, 'Open tickets')).toBeFocused();
      await page.keyboard.press('Home');
      await expect(revenue).toBeFocused();
    });

    test('Ctrl+Arrow moves the focused tile and keeps focus', async ({
      page,
    }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'reorder-by-drag-keyboard');
      const revenue = tile(demo, 'Revenue');
      await revenue.scrollIntoViewIfNeeded();
      await revenue.focus();
      await page.keyboard.press('Control+ArrowRight');
      await expect(demo.getByTestId('tile-reorder-log')).toHaveText(
        'Moved revenue from 1 to 2 (keyboard)',
      );
      await expect
        .poll(() => tileKeys(demo))
        .toEqual([
          'orders',
          'revenue',
          'visitors',
          'traffic',
          'conversion',
          'refunds',
          'tickets',
        ]);
      await expect.poll(() => focusedTileKey(page)).toBe('revenue');
      await page.keyboard.press('Control+ArrowLeft');
      await expect(demo.getByTestId('tile-reorder-log')).toHaveText(
        'Moved revenue from 2 to 1 (keyboard)',
      );
      await expect.poll(() => focusedTileKey(page)).toBe('revenue');
    });

    test('dragging a header reorders; Escape cancels', async ({ page }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'reorder-by-drag-keyboard');
      const orders = tile(demo, 'Orders');
      await orders.scrollIntoViewIfNeeded();
      const header = orders.locator('.oge-tile-layout-header');
      const from = await header.boundingBox();
      const target = await tile(demo, 'Visitors').boundingBox();
      if (!from || !target) throw new Error('tiles not laid out');
      const start = { x: from.x + 30, y: from.y + from.height / 2 };
      const end = { x: target.x + 30, y: target.y + target.height / 2 };

      // Escape mid-drag: nothing moves
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 });
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(demo.getByTestId('tile-reorder-log')).toHaveText(
        'Drag a header or press Ctrl+Arrow on a tile.',
      );

      await drag(page, start, end);
      await expect(demo.getByTestId('tile-reorder-log')).toHaveText(
        'Moved orders from 2 to 3 (pointer)',
      );
      await expect
        .poll(async () => (await tileKeys(demo)).slice(0, 3))
        .toEqual(['revenue', 'visitors', 'orders']);
    });

    test('Ctrl+Shift+Arrow and the corner handle resize within bounds', async ({
      page,
    }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'resizing-tiles');
      const log = demo.getByTestId('tile-resize-log');
      const revenue = tile(demo, 'Revenue');
      await revenue.scrollIntoViewIfNeeded();
      await revenue.focus();
      await page.keyboard.press('Control+Shift+ArrowRight');
      await expect(log).toHaveText('revenue: 3 × 1 (keyboard)');
      // maxColSpan is 3: a further press changes nothing
      await page.keyboard.press('Control+Shift+ArrowRight');
      await expect(log).toHaveText('revenue: 3 × 1 (keyboard)');
      await expect(revenue).toContainText('3 × 1');

      const orders = tile(demo, 'Orders');
      const box = await orders.boundingBox();
      const handle = orders.locator('.oge-tile-layout-resize');
      await expect(handle).toHaveAttribute('aria-hidden', 'true');
      const hb = await handle.boundingBox();
      if (!box || !hb) throw new Error('tile not laid out');
      const start = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 };
      await drag(page, start, {
        x: start.x + box.width * 0.9,
        y: start.y,
      });
      await expect(log).toHaveText('orders: 2 × 1 (pointer)');
      await expect(orders).toContainText('2 × 1');
    });

    test('the state round-trips through applyState()', async ({ page }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'persisted-layout-state');
      const revenue = tile(demo, 'Revenue');
      await revenue.scrollIntoViewIfNeeded();
      await revenue.focus();
      await page.keyboard.press('Control+ArrowRight');
      await expect(demo.getByTestId('tile-state')).toContainText('"version":1');
      await expect.poll(async () => (await tileKeys(demo))[1]).toBe('revenue');

      await demo.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect.poll(async () => (await tileKeys(demo))[0]).toBe('revenue');

      await demo
        .getByRole('button', { name: 'Restore saved', exact: true })
        .click();
      await expect.poll(async () => (await tileKeys(demo))[1]).toBe('revenue');
    });

    test('a header button never starts a drag', async ({ page }) => {
      await page.goto(`/components/tile-layout${fw.query}`);
      const demo = card(page, 'declarative-tiles-templates');
      const add = demo.getByRole('button', { name: 'Add', exact: true });
      await add.scrollIntoViewIfNeeded();
      await add.click();
      await expect(demo.getByTestId('tile-notes')).toHaveText('4 notes pinned');
      await expect(
        demo.getByRole('link', { name: 'Team handbook' }),
      ).toBeVisible();
    });

    test('tile layout page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/tile-layout${fw.query}`);
      await expect(
        page.getByRole('list', { name: 'Sales dashboard', exact: true }),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
