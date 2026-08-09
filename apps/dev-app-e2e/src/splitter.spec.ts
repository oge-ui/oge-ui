import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Reads the grid template the splitter writes onto its own host. */
async function tracks(
  locator: import('@playwright/test').Locator,
  axis: 'columns' | 'rows' = 'columns',
) {
  return locator.evaluate(
    (el, which) =>
      getComputedStyle(el).getPropertyValue(`grid-template-${which}`),
    axis,
  );
}

test('dragging a separator resizes both neighbouring panes', async ({
  page,
}) => {
  await page.goto('/components/splitter');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Resizable panes' });
  const splitter = card.locator('.oge-splitter').first();
  const separator = splitter.locator('.oge-splitter-separator').first();

  const before = await tracks(splitter);
  await separator.scrollIntoViewIfNeeded();
  const box = await separator.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 120,
    box!.y + box!.height / 2,
  );
  await page.mouse.up();

  await expect.poll(async () => tracks(splitter)).not.toBe(before);
  // the reported sizes follow the drag
  await expect(card.getByText(/^sizes →/)).toBeVisible();
});

test('arrow keys move a focused separator and update aria-valuenow', async ({
  page,
}) => {
  await page.goto('/components/splitter');
  const splitter = page
    .locator('app-demo-card')
    .filter({ hasText: 'Keyboard & accessibility' })
    .locator('.oge-splitter')
    .first();
  const separator = splitter.locator('.oge-splitter-separator').first();

  await expect(separator).toBeVisible();
  await separator.focus();
  const before = Number(await separator.getAttribute('aria-valuenow'));
  expect(before).toBeGreaterThan(0);
  await separator.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', String(before + 10));

  await separator.press('Home');
  await expect
    .poll(async () => await separator.getAttribute('aria-valuenow'))
    .toBe(await separator.getAttribute('aria-valuemin'));
  await separator.press('End');
  await expect
    .poll(async () => await separator.getAttribute('aria-valuenow'))
    .toBe(await separator.getAttribute('aria-valuemax'));
});

test('Enter collapses the primary pane and restores it', async ({ page }) => {
  await page.goto('/components/splitter');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Collapsible panes' });
  const splitter = card.locator('.oge-splitter').first();
  const separator = splitter.locator('.oge-splitter-separator').first();
  const side = splitter.locator('.oge-splitter-pane').first();

  await expect(card.getByText('collapsed → false')).toBeVisible();
  await separator.focus();
  await separator.press('Enter');

  await expect(side).toHaveClass(/oge-splitter-pane-collapsed/);
  await expect(side).toHaveAttribute('inert', '');
  await expect(card.getByText(/collapsed → true/)).toBeVisible();
  // focus stays on the separator rather than falling to <body>
  await expect(separator).toBeFocused();

  await separator.press('Enter');
  await expect(side).not.toHaveAttribute('inert', '');
});

test('a nested splitter lays its panes out on the opposite axis', async ({
  page,
}) => {
  await page.goto('/components/splitter');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Nested splitters' });
  const outer = card.locator('.oge-splitter').first();
  const inner = card.locator('.oge-splitter .oge-splitter').first();

  await expect(outer).toHaveAttribute('data-orientation', 'horizontal');
  await expect(inner).toHaveAttribute('data-orientation', 'vertical');
  await expect.poll(async () => tracks(inner, 'rows')).not.toBe('none');
});

test('a fixed pane keeps its pixel width while the fluid pane absorbs the rest', async ({
  page,
}) => {
  await page.goto('/components/splitter');
  const splitter = page
    .locator('app-demo-card')
    .filter({ hasText: 'Fixed and fluid panes' })
    .locator('.oge-splitter')
    .first();
  const fixed = splitter.locator('.oge-splitter-pane').first();
  await expect(fixed).toBeVisible();
  await expect
    .poll(async () => Math.round((await fixed.boundingBox())!.width))
    .toBe(240);
});

/**
 * The forms package lays its columns out with `@container` queries on its own
 * inline size. A splitter pane must therefore be a plain block box — if the
 * splitter set `container-type` on its panes, or the pane failed to shrink,
 * the form inside would never see the width change.
 */
test('a form inside a pane re-lays out from the pane width, not the window', async ({
  page,
}) => {
  await page.goto('/components/splitter');
  const splitter = page
    .locator('app-demo-card')
    .filter({ hasText: 'Forms inside a pane' })
    .locator('.oge-splitter')
    .first();
  const pane = splitter.locator('.oge-splitter-pane').first();
  const fields = splitter.locator('.oge-form-fields').first();

  // the pane itself must not become a query container, or the form would
  // resolve its @container queries against the wrong element
  expect(await pane.evaluate((el) => getComputedStyle(el).containerType)).toBe(
    'normal',
  );
  const columnsOf = async () =>
    (
      await fields.evaluate((el) => getComputedStyle(el).gridTemplateColumns)
    ).split(' ').length;

  const wide = await columnsOf();
  expect(wide).toBeGreaterThan(1);

  // shrink the pane well below the form's sm breakpoint without touching the
  // window size at all
  const separator = splitter.locator('.oge-splitter-separator').first();
  await separator.scrollIntoViewIfNeeded();
  const box = (await separator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 400, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();

  await expect.poll(columnsOf).toBeLessThan(wide);
});

test('splitter overview has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/splitter');
  await expect(page.locator('.oge-splitter-separator').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-splitter')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});

test('splitter API page renders its sections and has no axe violations', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/splitter/api');
  await expect(page.locator('#ogesplitter-properties')).toBeVisible();
  await expect(page.locator('#ogesplitterpane-properties')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('app-api-reference')
    .disableRules(['color-contrast'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
