import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * jsdom cannot lay out the two-pane grid, measure bar geometry or drive real
 * pointer capture — this suite proves the Gantt's rendering, tree
 * expand/collapse, gestures (drag with mid-drag Escape restore), dialog
 * editing, undo and axe-clean accessibility on real DOM in both themes.
 */

const BASIC = 'app-demo-card:has(#getting-started)';

function gantt(page: Page): Locator {
  return page.locator(`${BASIC} oge-gantt`);
}

async function openBasic(page: Page): Promise<void> {
  await page.goto('/components/gantt');
  await gantt(page).scrollIntoViewIfNeeded();
}

test.describe('gantt', () => {
  test('renders the task tree, bars, milestone and dependency arrows', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    await expect(
      host.getByRole('row', { name: /Implementation/ }),
    ).toBeVisible();
    // summary bracket for the parent, regular bars, a milestone diamond
    await expect(host.locator('.oge-gantt-summary')).toHaveCount(1);
    await expect(host.locator('.oge-gantt-milestone')).toHaveCount(1);
    expect(await host.locator('.oge-gantt-bar').count()).toBeGreaterThan(1);
    // two dependency arrows
    await expect(host.locator('.oge-gantt-arrow')).toHaveCount(2);
  });

  test('collapse and expand fold the subtree in both panes', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    const rows = host.getByRole('row');
    const before = await rows.count();
    const toggle = host.locator('.oge-gantt-toggle').first();
    await toggle.click();
    await expect(rows).toHaveCount(before - 3);
    // delay so the two toggle clicks never coalesce into a dblclick
    await toggle.click({ delay: 50 });
    await expect(rows).toHaveCount(before);
  });

  test('drag-move commits and undo restores; mid-drag Escape cancels', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    const bar = host.locator('.oge-gantt-bar', {
      hasText: 'Implementation',
    });
    const before = await bar.boundingBox();
    if (before === null) throw new Error('bar not laid out');
    // grab near the left edge — the page TOC overlays the chart's right half
    const grabX = before.x + 30;
    const grabY = before.y + before.height / 2;

    // committed drag: two day ticks to the right
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 80, grabY, { steps: 8 });
    await expect(host.locator('.oge-gantt-drag-tip')).toBeVisible();
    await page.mouse.up();
    const moved = await bar.boundingBox();
    expect((moved?.x ?? 0) - before.x).toBeGreaterThan(10);

    // toolbar undo restores the committed position
    await host.getByRole('button', { name: 'Undo' }).click();
    const undone = await bar.boundingBox();
    expect(Math.round(undone?.x ?? 0)).toBe(Math.round(before.x));

    // cancelled drag: Escape mid-gesture restores the position
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 120, grabY, { steps: 8 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const after = await bar.boundingBox();
    expect(Math.round(after?.x ?? 0)).toBe(Math.round(before.x));
  });

  test('toolbar "New task" creates through the dialog', async ({ page }) => {
    await openBasic(page);
    const host = gantt(page);
    await host.getByRole('button', { name: 'New task' }).click();
    const dialog = page.locator('.oge-modal', { hasText: 'New task' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input').first().fill('Playwright task');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      host.getByRole('row', { name: /Playwright task/ }),
    ).toBeVisible();
  });

  test('double-clicking a bar opens the edit dialog', async ({ page }) => {
    await openBasic(page);
    const host = gantt(page);
    await host.locator('.oge-gantt-bar', { hasText: 'Design' }).dblclick();
    const dialog = page.locator('.oge-modal', { hasText: 'Edit task' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input').first()).toHaveValue('Design');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('keyboard: roving rows, zoom buttons change the scale', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    const focused = host.locator('[role="row"][tabindex="0"]');
    await focused.focus();
    await page.keyboard.press('ArrowDown');
    await expect(host.locator('[role="row"][tabindex="0"]')).toBeFocused();

    const cells = host.locator('.oge-gantt-scale-minor .oge-gantt-scale-cell');
    const minorBefore = await cells.count();
    await host.getByRole('button', { name: 'Zoom out' }).click();
    await expect(cells).not.toHaveCount(minorBefore);
  });

  test('right-click opens the built-in menu; draw-to-create opens a prefilled dialog', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);

    // draw-to-create on empty chart space: the left half of the milestone
    // row is empty (the page TOC overlays the chart's right side)
    const bar = host.locator('.oge-gantt-bar', { hasText: 'Design' });
    const box = await bar.boundingBox();
    if (box === null) throw new Error('no bar box');
    const milestone = await host.locator('.oge-gantt-milestone').boundingBox();
    if (milestone === null) throw new Error('no milestone box');
    const y = milestone.y + milestone.height / 2;
    const startX = box.x + 20;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + 70, y, { steps: 5 });
    await expect(host.locator('.oge-gantt-draw-preview')).toHaveCount(1);
    await page.mouse.up();
    const createDialog = page.locator('.oge-modal', { hasText: 'New task' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(createDialog).toBeHidden();

    // context menu on a row
    await host.getByRole('row', { name: /Design/ }).click({ button: 'right' });
    const menu = page.locator('.oge-gantt-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Indent' })).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Edit' }).click();
    const editDialog = page.locator('.oge-modal', { hasText: 'Edit task' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(editDialog).toBeHidden();
  });

  test('end-handle resize widens the bar; moving the earliest task never re-anchors the chart', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    const bar = host.locator('.oge-gantt-bar', { hasText: 'Design' });
    const before = await bar.boundingBox();
    if (before === null) throw new Error('no bar');
    // resize: the title span is pointer-events none, so the handle is hittable
    await bar.hover({ position: { x: 20, y: 8 } });
    const handle = bar.locator('.oge-gantt-handle-end');
    const hb = await handle.boundingBox();
    if (hb === null) throw new Error('no handle');
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + 80, hb.y + hb.height / 2, {
      steps: 6,
    });
    await page.mouse.up();
    await expect
      .poll(async () => (await bar.boundingBox())?.width)
      .toBeGreaterThan(before.width + 60);
    // moving the EARLIEST task right must move it visually (stable range)
    const b2 = await bar.boundingBox();
    if (b2 === null) throw new Error('no bar 2');
    await page.mouse.move(b2.x + 20, b2.y + b2.height / 2);
    await page.mouse.down();
    await page.mouse.move(b2.x + 100, b2.y + b2.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect
      .poll(async () => (await bar.boundingBox())?.x)
      .toBeGreaterThan(b2.x + 60);
  });

  test('hover tooltip shows task details; workload band renders per resource', async ({
    page,
  }) => {
    await openBasic(page);
    const host = gantt(page);
    const bar = host.locator('.oge-gantt-bar', { hasText: 'Implementation' });
    // hover near the left edge — the page TOC overlays the chart's right half
    await bar.hover({ position: { x: 20, y: 8 } });
    const tooltip = host.locator('.oge-gantt-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Implementation');
    await expect(tooltip).toContainText('45%');
    // first-row tooltips flip below the sticky header, never under it
    await host
      .locator('.oge-gantt-summary')
      .hover({ position: { x: 30, y: 5 } });
    await expect(tooltip).toBeVisible();
    const tipBox = await tooltip.boundingBox();
    const scale = await host.locator('.oge-gantt-scale').boundingBox();
    if (tipBox === null || scale === null) throw new Error('no boxes');
    expect(tipBox.y).toBeGreaterThanOrEqual(scale.y + scale.height - 1);

    // the work-calendar demo renders one workload row per resource
    const workload = page.locator('.oge-gantt-workload-row');
    await expect(workload).toHaveCount(2);
  });

  test('axe: no violations in either theme', async ({ page }) => {
    test.slow();
    await openBasic(page);
    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('oge-gantt')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
