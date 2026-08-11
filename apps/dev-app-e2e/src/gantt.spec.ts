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
