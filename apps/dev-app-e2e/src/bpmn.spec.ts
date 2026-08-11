import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * jsdom cannot run pointer gestures or lay out the SVG canvas — this suite
 * proves click-then-place, the ghost-move drag with Escape-cancel, the
 * context-pad append, snapshot undo, the docs import/export round-trip and a
 * clean axe run in both themes on real DOM.
 */

const GETTING = 'app-demo-card:has(#getting-started)';
const IO = 'app-demo-card:has(#import-export)';

/** Places one Task via the palette and returns its shape locator. */
async function placeTask(
  page: import('@playwright/test').Page,
): Promise<import('@playwright/test').Locator> {
  const editor = page.locator(`${GETTING} oge-bpmn-editor`);
  await editor.scrollIntoViewIfNeeded();
  await editor.getByRole('button', { name: 'Task', exact: true }).click();
  await editor
    .locator('.oge-bpmn-canvas')
    .click({ position: { x: 320, y: 200 } });
  const shape = editor.locator('.oge-bpmn-shape');
  await expect(shape).toHaveCount(1);
  return shape.first();
}

test('palette click-then-place creates a shape on the canvas', async ({
  page,
}) => {
  await page.goto('/components/bpmn');
  const shape = await placeTask(page);
  await expect(shape).toBeVisible();
  // placement arms nothing further: the new shape is selected (context pad)
  await expect(page.locator(`${GETTING} .oge-bpmn-context-pad`)).toBeVisible();
});

test('drag moves a shape and Escape mid-drag restores it', async ({ page }) => {
  await page.goto('/components/bpmn');
  const shape = await placeTask(page);

  const before = await shape.getAttribute('transform');
  let box = await shape.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  // commit-on-release drag by (120, 60)
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

  // Escape mid-second-drag cancels: the committed position survives
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

test('context pad appends a connected task', async ({ page }) => {
  await page.goto('/components/bpmn');
  await placeTask(page);
  const editor = page.locator(`${GETTING} oge-bpmn-editor`);
  // the placed shape is selected, so the context pad is already up
  await editor.getByRole('button', { name: 'Append task' }).click();
  await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(2);
  await expect(editor.locator('.oge-bpmn-edge')).toHaveCount(1);
});

test('Ctrl+Z undoes place and append back to an empty diagram', async ({
  page,
}) => {
  await page.goto('/components/bpmn');
  await placeTask(page);
  const editor = page.locator(`${GETTING} oge-bpmn-editor`);
  await editor.getByRole('button', { name: 'Append task' }).click();
  await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(2);

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
  await page.goto('/components/bpmn');
  const editor = page.locator(`${IO} oge-bpmn-editor`);
  await editor.scrollIntoViewIfNeeded();
  await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(0);

  await page.locator('[data-testid="bpmn-import"]').click();
  // start + user task + gateway + two end events
  await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(5);
  await expect(editor.locator('.oge-bpmn-edge')).toHaveCount(4);

  await page.locator('[data-testid="bpmn-export"]').click();
  const xml = await page.locator('[data-testid="bpmn-xml"]').inputValue();
  expect(xml).toContain('<bpmn:userTask');
  expect(xml).toContain('<bpmndi:BPMNShape');
});

test('bpmn page has no axe violations (light and dark)', async ({ page }) => {
  test.slow();
  await page.goto('/components/bpmn');
  await expect(page.locator('oge-bpmn-editor').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-bpmn-editor')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
