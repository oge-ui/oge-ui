import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Axe accessibility scans of the grid on representative pages.
 * `color-contrast` is excluded — demo palette tuning is a docs concern,
 * not a grid-markup concern.
 */
// Axe scans are CPU-heavy and three run concurrently — give them headroom.
test.beforeEach(() => test.slow());

async function scanGrid(page: import('@playwright/test').Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.oge-grid')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
}

test('data grid overview has no axe violations', async ({ page }) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();
  await scanGrid(page);
});

test('grouped grid with summaries has no axe violations', async ({ page }) => {
  // the grouped grid is axe's slowest scan in the suite (~40s alone) and
  // trips the file-wide slow() timeout (90s) under full-suite worker
  // contention; slow() is idempotent, so raise the ceiling explicitly
  test.setTimeout(240_000);
  await page.goto('/components/data-grid/grouping');
  await expect(page.locator('.oge-group-row').first()).toBeVisible();
  await scanGrid(page);
});

test('load panel page has no axe violations while panels are shown', async ({
  page,
}) => {
  await page.goto('/components/progress/load-panel');
  await expect(page.locator('.oge-load-panel-shown').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('app-demo-card')
    // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});

test('selection grid has no axe violations', async ({ page }) => {
  await page.goto('/components/data-grid/selection');
  await expect(page.locator('.oge-row').first()).toBeVisible();
  await scanGrid(page);
});

test('rich-text editor page has no axe violations, with a toolbar popup open', async ({
  page,
}) => {
  await page.goto('/components/editor');
  const demo = page.locator('app-demo-card:has(#getting-started)');
  await expect(demo.locator('.oge-editor-content')).toBeVisible();
  // the block-format menu renders inside the card
  await demo.locator('[data-oge-editor-tool="blockFormat"]').click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Heading 2' }),
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
