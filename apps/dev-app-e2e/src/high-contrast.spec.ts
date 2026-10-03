import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The high-contrast theme is the one place the suite promises contrast
 * numbers (AAA-ish text, 3:1 UI), so unlike `a11y.spec.ts` this scan keeps
 * axe's `color-contrast` rule ON.
 */
test.beforeEach(() => test.slow());

test('data grid under the high-contrast theme passes axe incl. color-contrast', async ({
  page,
}) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // the docs theme select: the suite's own select box
  await page.locator('.app-theme-select .oge-input-container').click();
  await page
    .locator('.oge-select-option', { hasText: 'High contrast' })
    .click();
  await expect(page.locator('html')).toHaveClass(/oge-theme-high-contrast/);
  // the grid header follows the high-contrast tokens (#f2f2f2)
  await expect
    .poll(() =>
      page
        .locator('.oge-header-cell')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe('rgb(242, 242, 242)');

  const results = await new AxeBuilder({ page }).include('.oge-grid').analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
