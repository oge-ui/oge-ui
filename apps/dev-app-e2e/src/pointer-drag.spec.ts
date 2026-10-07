import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Pointer drag (no HTML5 drag and drop anywhere in packages/): column
 * reorder, group-by drag, row drag, pivot field move and kanban card drag,
 * with the mouse (`page.mouse`) and with touch — dispatched `pointerType:
 * 'touch'` sequences that honour the long press, plus one real CDP touch
 * sequence on the board — in both render layers.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

interface Point {
  x: number;
  y: number;
}

async function center(locator: Locator, dx = 0, dy = 0): Promise<Point> {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy };
}

async function mouseDrag(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

/**
 * A touch drag as the browser reports it to script: pointer events with
 * `pointerType: 'touch'`, dispatched at the element under each point (so
 * they bubble to the document listeners). `hold` waits before moving — the
 * long press touch drags need; `0` swipes at once.
 */
async function touchDrag(
  page: Page,
  from: Point,
  to: Point,
  hold = 450,
): Promise<void> {
  const fire = (type: string, point: Point) =>
    page.evaluate(
      ({ type, point }) => {
        const target =
          document.elementFromPoint(point.x, point.y) ?? document.body;
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 41,
            pointerType: 'touch',
            isPrimary: true,
            button: type === 'pointermove' ? -1 : 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: point.x,
            clientY: point.y,
          }),
        );
      },
      { type, point },
    );
  await fire('pointerdown', from);
  if (hold > 0) await page.waitForTimeout(hold);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await fire('pointermove', {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    });
  }
  await fire('pointerup', to);
}

function headerCells(grid: Locator): Locator {
  return grid.locator('.oge-header-row > .oge-header-cell[data-colid]');
}

async function colIds(grid: Locator): Promise<(string | null)[]> {
  return headerCells(grid).evaluateAll((cells) =>
    cells.map((cell) => cell.getAttribute('data-colid')),
  );
}

async function firstGrid(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const grid = page.locator('.oge-grid').first();
  await expect(grid.locator('.oge-row').first()).toBeVisible({
    timeout: 30_000,
  });
  return grid;
}

for (const fw of FRAMEWORKS) {
  test.describe(`${fw.name} pointer drag`, () => {
    test('column reorder: mouse drag of a header onto another', async ({
      page,
    }) => {
      const grid = await firstGrid(page, `/components/data-grid${fw.query}`);
      const before = await colIds(grid);
      expect(await grid.locator('[draggable="true"]').count()).toBe(0);
      const source = headerCells(grid).nth(1);
      const target = headerCells(grid).nth(3);
      await mouseDrag(
        page,
        await center(source, -10),
        await center(target, -10),
      );
      await expect
        .poll(() => colIds(grid))
        .toEqual([before[0], before[2], before[1], ...before.slice(3)]);
      // the drop did not also sort the column it ended on
      await expect(target).not.toHaveAttribute('aria-sort', 'ascending');
    });

    test('column reorder: touch needs a long press, a swipe does nothing', async ({
      page,
    }) => {
      const grid = await firstGrid(page, `/components/data-grid${fw.query}`);
      const before = await colIds(grid);
      const from = await center(headerCells(grid).nth(1), -10);
      const to = await center(headerCells(grid).nth(3), -10);
      await touchDrag(page, from, to, 0);
      expect(await colIds(grid)).toEqual(before);
      await touchDrag(page, from, to);
      await expect
        .poll(() => colIds(grid))
        .toEqual([before[0], before[2], before[1], ...before.slice(3)]);
    });

    test('group by: drag a header into the group panel (mouse and touch)', async ({
      page,
    }) => {
      const grid = await firstGrid(
        page,
        `/components/data-grid/grouping${fw.query}`,
      );
      const chips = grid.locator('.oge-group-chip');
      const start = await chips.count();
      const panel = grid.locator('.oge-group-panel');
      await mouseDrag(
        page,
        await center(
          grid.locator('.oge-header-row > .oge-header-cell[data-colid="city"]'),
        ),
        await center(panel),
      );
      await expect(chips).toHaveCount(start + 1);
      await expect(chips.last()).toContainText('City');
      // touch: long press a second header into the panel
      const header = headerCells(grid).filter({ hasNotText: 'City' }).last();
      const caption = (
        await header.locator('.oge-header-caption').innerText()
      ).trim();
      await touchDrag(page, await center(header), await center(panel));
      await expect(chips).toHaveCount(start + 2);
      await expect(chips.last()).toContainText(caption);
    });

    test('row drag: the handle moves a row (mouse, then touch at once)', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/rows${fw.query}`);
      const card = page
        .locator('app-demo-card')
        .filter({ has: page.locator('.oge-drag-handle') })
        .first();
      const grid = card.locator('.oge-grid');
      const rows = grid.locator('.oge-row');
      await expect(rows.first()).toBeVisible({ timeout: 30_000 });
      const textAt = async (index: number) =>
        (
          await rows.nth(index).locator('[data-cell]').first().innerText()
        ).trim();
      const first = await textAt(0);
      await mouseDrag(
        page,
        await center(rows.nth(0).locator('.oge-drag-handle')),
        await center(rows.nth(2), 0, 4),
      );
      await expect(rows.nth(2).locator('[data-cell]').first()).toHaveText(
        first,
      );
      await expect(card).toContainText('→ index 2');
      await expect(grid.locator('.oge-drop-target')).toHaveCount(0);

      // the handle is touch-action: none, so touch drags without a hold
      await expect(rows.first().locator('.oge-drag-handle')).toHaveCSS(
        'touch-action',
        'none',
      );
      const second = await textAt(1);
      await touchDrag(
        page,
        await center(rows.nth(1).locator('.oge-drag-handle')),
        await center(rows.nth(0), 0, 4),
        0,
      );
      await expect(rows.nth(0).locator('[data-cell]').first()).toHaveText(
        second,
      );
    });

    test('row drag: Escape mid-drag cancels', async ({ page }) => {
      await page.goto(`/components/data-grid/rows${fw.query}`);
      const card = page
        .locator('app-demo-card')
        .filter({ has: page.locator('.oge-drag-handle') })
        .first();
      const rows = card.locator('.oge-grid .oge-row');
      await expect(rows.first()).toBeVisible({ timeout: 30_000 });
      const first = (
        await rows.nth(0).locator('[data-cell]').first().innerText()
      ).trim();
      const from = await center(rows.nth(0).locator('.oge-drag-handle'));
      const to = await center(rows.nth(2), 0, 4);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 8 });
      await expect(card.locator('.oge-drop-target')).toHaveCount(1);
      await expect(page.locator('.oge-drag-ghost')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(rows.nth(0).locator('[data-cell]').first()).toHaveText(
        first,
      );
      await expect(card.locator('.oge-drop-target')).toHaveCount(0);
      await expect(page.locator('.oge-drag-ghost')).toHaveCount(0);
    });

    test('the column resize handle is touch-action: none', async ({ page }) => {
      const grid = await firstGrid(page, `/components/data-grid${fw.query}`);
      await expect(grid.locator('.oge-resize-handle').first()).toHaveCSS(
        'touch-action',
        'none',
      );
    });

    test('pivot: field chips move between areas (mouse and touch)', async ({
      page,
    }) => {
      await page.goto(`/components/pivot-grid${fw.query}`);
      const panel = page.locator('.oge-pivot-field-panel').first();
      await expect(panel.locator('.oge-pivot-field-chip').first()).toBeVisible({
        timeout: 30_000,
      });
      expect(await panel.locator('[draggable="true"]').count()).toBe(0);
      const area = (name: string) =>
        panel.locator(`.oge-pivot-area[data-area="${name}"]`);
      const rowChip = area('row').locator('.oge-pivot-field-chip').last();
      const caption = (await rowChip.innerText()).trim();
      const columnCount = await area('column')
        .locator('.oge-pivot-field-chip')
        .count();
      await mouseDrag(
        page,
        await center(rowChip),
        await center(area('column'), 40),
      );
      await expect(area('column').locator('.oge-pivot-field-chip')).toHaveCount(
        columnCount + 1,
      );
      await expect(
        area('column').locator('.oge-pivot-field-chip', { hasText: caption }),
      ).toBeVisible();
      // touch: a long press carries it back to the rows
      await touchDrag(
        page,
        await center(
          area('column').locator('.oge-pivot-field-chip', { hasText: caption }),
        ),
        await center(area('row'), 40),
      );
      await expect(
        area('row').locator('.oge-pivot-field-chip', { hasText: caption }),
      ).toBeVisible();
      await expect(area('column').locator('.oge-pivot-field-chip')).toHaveCount(
        columnCount,
      );
    });

    test(
      'kanban: a touch long press drags a card to the next column',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(`/components/kanban${fw.query}`);
        const host = page.locator(
          'app-demo-card:has(#getting-started) .oge-kanban',
        );
        await host.scrollIntoViewIfNeeded();
        const card = host
          .locator('.oge-kanban-cards[data-col="todo"] .oge-kanban-card')
          .first();
        await expect(card).toBeVisible({ timeout: 30_000 });
        const title = (
          await card.locator('.oge-kanban-card-title').innerText()
        ).trim();
        const doing = host.locator('.oge-kanban-cards[data-col="doing"]');
        const box = (await card.boundingBox())!;
        const target = (await doing.boundingBox())!;
        // a swipe without the hold never lifts the card
        await touchDrag(
          page,
          { x: box.x + 40, y: box.y + 10 },
          { x: target.x + target.width / 2, y: target.y + 60 },
          0,
        );
        await expect(
          doing.locator('.oge-kanban-card-title', { hasText: title }),
        ).toHaveCount(0);
        await touchDrag(
          page,
          { x: box.x + 40, y: box.y + 10 },
          { x: target.x + target.width / 2, y: target.y + 60 },
        );
        await expect(
          doing.locator('.oge-kanban-card-title', { hasText: title }),
        ).toBeVisible();
      },
    );
  });
}

test.describe('real touch input (CDP)', () => {
  test.use({ hasTouch: true });
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Input.dispatchTouchEvent is a Chrome DevTools Protocol call',
  );

  for (const fw of FRAMEWORKS) {
    test(`${fw.name} kanban: held finger drags the card instead of panning`, async ({
      page,
    }) => {
      await page.goto(`/components/kanban${fw.query}`);
      const host = page.locator(
        'app-demo-card:has(#getting-started) .oge-kanban',
      );
      await host.scrollIntoViewIfNeeded();
      const card = host
        .locator('.oge-kanban-cards[data-col="todo"] .oge-kanban-card')
        .first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      const title = (
        await card.locator('.oge-kanban-card-title').innerText()
      ).trim();
      const doing = host.locator('.oge-kanban-cards[data-col="doing"]');
      const box = (await card.boundingBox())!;
      const target = (await doing.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      const touch = (type: string, x: number, y: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
        });
      const from = { x: box.x + 40, y: box.y + 10 };
      const to = { x: target.x + target.width / 2, y: target.y + 60 };
      await touch('touchStart', from.x, from.y);
      await page.waitForTimeout(450);
      for (let i = 1; i <= 10; i++) {
        await touch(
          'touchMove',
          from.x + ((to.x - from.x) * i) / 10,
          from.y + ((to.y - from.y) * i) / 10,
        );
      }
      await touch('touchEnd', to.x, to.y);
      await expect(
        doing.locator('.oge-kanban-card-title', { hasText: title }),
      ).toBeVisible();
    });
  }
});
