import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Axe accessibility scans of the grid on representative pages.
 * `color-contrast` is excluded — demo palette tuning is a docs concern,
 * not a grid-markup concern.
 */
async function scanGrid(page: import('@playwright/test').Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.oge-grid')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
  ).toEqual([]);
}

test('data grid overview has no axe violations', async ({ page }) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();
  await scanGrid(page);
});

test('grouped grid with summaries has no axe violations', async ({ page }) => {
  await page.goto('/components/data-grid/grouping');
  await expect(page.locator('.oge-group-row').first()).toBeVisible();
  await scanGrid(page);
});

test('selection grid has no axe violations', async ({ page }) => {
  await page.goto('/components/data-grid/selection');
  await expect(page.locator('.oge-row').first()).toBeVisible();
  await scanGrid(page);
});
