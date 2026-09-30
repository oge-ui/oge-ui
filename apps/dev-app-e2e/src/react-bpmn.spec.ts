import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the BPMN family (ADR 0002 + `docs/REACT-PARITY.md`): the
 * overview and API pages render the real React editor on the same routes the
 * Angular view uses, the gestures jsdom cannot run (click-then-place, the
 * ghost-move drag with Escape-cancel, the context-pad append, snapshot undo,
 * the docs import/export round-trip) work on real DOM, and the pages are
 * axe-clean in both themes — the Angular `bpmn.spec.ts`, case for case.
 */
const REACT = '?framework=react';

/** The h3 is matched exactly — `hasText` is a substring match. */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

function editorIn(page: Page, heading: string): Locator {
  return section(page, heading).locator('app-react-host .oge-bpmn-editor');
}

/** Places one Task via the palette and returns its shape locator. */
async function placeTask(page: Page): Promise<Locator> {
  const editor = editorIn(page, 'Getting started');
  await editor.scrollIntoViewIfNeeded();
  await editor.getByRole('button', { name: 'Task', exact: true }).click();
  await editor
    .locator('.oge-bpmn-canvas')
    .click({ position: { x: 320, y: 200 } });
  const shape = editor.locator('.oge-bpmn-shape');
  await expect(shape).toHaveCount(1);
  return shape.first();
}

test.describe('React BPMN docs', () => {
  test('the overview mounts the React editor without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.locator('app-react-host .oge-bpmn-editor').first(),
    ).toBeVisible();
    // the Angular editor is not rendered in the React view
    await expect(page.locator('oge-bpmn-editor')).toHaveCount(0);
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/bpmn/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '<OgeBpmnEditor>' }),
    ).toBeVisible();
  });

  test('palette click-then-place creates a shape on the canvas', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    const shape = await placeTask(page);
    await expect(shape).toBeVisible();
    await expect(
      section(page, 'Getting started').locator('.oge-bpmn-context-pad'),
    ).toBeVisible();
  });

  test('drag moves a shape and Escape mid-drag restores it', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    const shape = await placeTask(page);

    const before = await shape.getAttribute('transform');
    let box = await shape.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 120,
      box.y + box.height / 2 + 60,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(shape).not.toHaveAttribute('transform', before ?? '');
    const moved = await shape.getAttribute('transform');

    box = await shape.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 80,
      box.y + box.height / 2 + 40,
      { steps: 8 },
    );
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(shape).toHaveAttribute('transform', moved ?? '');
  });

  test('context pad appends a connected task and Ctrl+Z undoes both', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    await placeTask(page);
    const editor = editorIn(page, 'Getting started');
    await editor.getByRole('button', { name: 'Append task' }).click();
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(2);
    await expect(editor.locator('.oge-bpmn-edge')).toHaveCount(1);

    await editor.locator('.oge-bpmn-canvas-wrap').focus();
    await page.keyboard.press('Control+z');
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(1);
    await expect(editor.locator('.oge-bpmn-edge')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(0);
  });

  test('docs demo imports the sample XML and exports it back', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    const card = section(page, 'Import & export');
    const editor = card.locator('.oge-bpmn-editor');
    await editor.scrollIntoViewIfNeeded();
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(0);

    await card.locator('[data-testid="bpmn-import"]').click();
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(5);
    await expect(editor.locator('.oge-bpmn-edge')).toHaveCount(4);

    await card.locator('[data-testid="bpmn-export"]').click();
    const xml = await card.locator('[data-testid="bpmn-xml"]').inputValue();
    expect(xml).toContain('<bpmn:userTask');
    expect(xml).toContain('<bpmndi:BPMNShape');
  });

  test('overlays attach a sanitized badge to the selection', async ({
    page,
  }) => {
    await page.goto(`/components/bpmn${REACT}`);
    const card = section(page, 'Overlays & monitoring');
    const editor = card.locator('.oge-bpmn-editor');
    await editor.scrollIntoViewIfNeeded();
    await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(5);
    await editor.locator('.oge-bpmn-shape').nth(1).click();
    await card.locator('[data-testid="bpmn-add-overlay"]').click();
    await expect(editor.locator('.oge-bpmn-overlay span')).toHaveText('1');
    await card.locator('[data-testid="bpmn-clear-overlays"]').click();
    await expect(editor.locator('.oge-bpmn-overlay')).toHaveCount(0);
  });

  test('bpmn page has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    await page.goto(`/components/bpmn${REACT}`);
    await expect(
      page.locator('app-react-host .oge-bpmn-editor').first(),
    ).toBeVisible();
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((mode) => {
        document.documentElement.classList.toggle(
          'oge-theme-dark',
          mode === 'dark',
        );
      }, theme);
      const results = await new AxeBuilder({ page })
        .include('app-react-host .oge-bpmn-editor')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations, `${theme} violations`).toEqual([]);
    }
  });
});
