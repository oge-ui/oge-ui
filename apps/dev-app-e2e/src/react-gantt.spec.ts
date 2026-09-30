import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the Gantt family (ADR 0002 + 0003, `docs/REACT-PARITY.md`):
 * the overview and API pages render the real React `<OgeGantt>` — the same
 * `OgeGanttCore` from `@oge-ui/gantt-engine` the Angular component runs — on
 * the same routes, and the gestures, dialog, keyboard map and axe cleanliness
 * the Angular suite (`gantt.spec.ts`) proves hold for the React layer too.
 */
const REACT = '?framework=react';

/** The demo card whose h3 is `heading` (headings are matched exactly). */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

function gantt(page: Page, heading = 'Getting started'): Locator {
  return section(page, heading).locator('app-react-host .oge-gantt');
}

async function openBasic(page: Page): Promise<Locator> {
  await page.goto(`/components/gantt${REACT}`);
  const host = gantt(page);
  await host.scrollIntoViewIfNeeded();
  return host;
}

test.describe('React gantt docs', () => {
  test('the overview mounts the React Gantt without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/gantt${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    // every Angular section has its React demo, in the same order
    await expect(page.locator('app-react-host .oge-gantt')).toHaveCount(9);
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/gantt/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '<OgeGantt>' }),
    ).toBeVisible();
    await expect(page.locator('.api-table').first()).toBeVisible();
  });

  test('renders the task tree, bars, milestone and dependency arrows', async ({
    page,
  }) => {
    const host = await openBasic(page);
    await expect(
      host.getByRole('row', { name: /Implementation/ }),
    ).toBeVisible();
    await expect(host.locator('.oge-gantt-summary')).toHaveCount(1);
    await expect(host.locator('.oge-gantt-milestone')).toHaveCount(1);
    expect(await host.locator('.oge-gantt-bar').count()).toBeGreaterThan(1);
    await expect(host.locator('.oge-gantt-arrow')).toHaveCount(2);
  });

  test('collapse and expand fold the subtree in both panes', async ({
    page,
  }) => {
    const host = await openBasic(page);
    const rows = host.getByRole('row');
    const before = await rows.count();
    const toggle = host.locator('.oge-gantt-toggle').first();
    await toggle.click();
    await expect(rows).toHaveCount(before - 3);
    await toggle.click({ delay: 50 });
    await expect(rows).toHaveCount(before);
  });

  test('drag-move commits and undo restores; mid-drag Escape cancels', async ({
    page,
  }) => {
    const host = await openBasic(page);
    const bar = host.locator('.oge-gantt-bar', { hasText: 'Implementation' });
    const before = await bar.boundingBox();
    if (before === null) throw new Error('bar not laid out');
    // grab near the left edge — the page TOC overlays the chart's right half
    const grabX = before.x + 30;
    const grabY = before.y + before.height / 2;

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 80, grabY, { steps: 8 });
    await expect(host.locator('.oge-gantt-drag-tip')).toBeVisible();
    await page.mouse.up();
    await expect
      .poll(async () => ((await bar.boundingBox())?.x ?? 0) - before.x)
      .toBeGreaterThan(10);

    await host.getByRole('button', { name: 'Undo' }).click();
    await expect
      .poll(async () => Math.round((await bar.boundingBox())?.x ?? 0))
      .toBe(Math.round(before.x));

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 120, grabY, { steps: 8 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect
      .poll(async () => Math.round((await bar.boundingBox())?.x ?? 0))
      .toBe(Math.round(before.x));
  });

  test('toolbar "New task" creates through the dialog', async ({ page }) => {
    const host = await openBasic(page);
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
    const host = await openBasic(page);
    await host.locator('.oge-gantt-bar', { hasText: 'Design' }).dblclick();
    const dialog = page.locator('.oge-modal', { hasText: 'Edit task' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input').first()).toHaveValue('Design');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('keyboard: roving rows; the controlled scale demo zooms', async ({
    page,
  }) => {
    const host = await openBasic(page);
    const focused = host.locator('[role="row"][tabindex="0"]');
    await focused.focus();
    await page.keyboard.press('ArrowDown');
    await expect(host.locator('[role="row"][tabindex="0"]')).toBeFocused();

    const toolbarDemo = gantt(page, 'Toolbar, scales & undo/redo');
    await toolbarDemo.scrollIntoViewIfNeeded();
    const cells = toolbarDemo.locator(
      '.oge-gantt-scale-minor .oge-gantt-scale-cell',
    );
    const minorBefore = await cells.count();
    await toolbarDemo.getByRole('button', { name: 'Zoom in' }).click();
    await expect(cells).not.toHaveCount(minorBefore);
  });

  test('right-click opens the built-in menu and its Edit item opens the dialog', async ({
    page,
  }) => {
    const host = await openBasic(page);
    await host.getByRole('row', { name: /Design/ }).click({ button: 'right' });
    const menu = page.locator('.oge-gantt-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Indent' })).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Edit' }).click();
    const dialog = page.locator('.oge-modal', { hasText: 'Edit task' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('render props replace the bar title; the workload band renders', async ({
    page,
  }) => {
    await page.goto(`/components/gantt${REACT}`);
    const templated = gantt(page, 'Task template');
    await templated.scrollIntoViewIfNeeded();
    await expect(
      templated.locator('.oge-gantt-bar-title strong', {
        hasText: 'Usability study',
      }),
    ).toBeVisible();
    await expect(page.locator('.oge-gantt-workload-row')).toHaveCount(2);
  });

  for (const path of ['/components/gantt', '/components/gantt/api']) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views — not something the React layer adds.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
