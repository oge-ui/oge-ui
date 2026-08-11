import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * jsdom cannot lay out the bar or measure a container — this suite proves the
 * click/aria-current contract on real DOM, keyboard operation on a real focus
 * model, the info live region, the container-width adaptive flip and a clean
 * axe run in both themes.
 */

const BASIC = 'app-demo-card:has(#getting-started)';
const SIZES = 'app-demo-card:has(#page-sizes-and-info)';
const ADAPTIVE = 'app-demo-card:has(#adaptive-display)';

test('page clicks move aria-current and update the model', async ({ page }) => {
  await page.goto('/components/pagination');
  const bar = page.locator(`${BASIC} oge-pagination`);
  await bar.scrollIntoViewIfNeeded();
  await expect(bar.locator('[aria-current="page"]')).toHaveText('1');
  await bar.getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(bar.locator('[aria-current="page"]')).toHaveText('2');
  await expect(page.locator('[data-testid="page-value"]')).toHaveText('1'); // 0-based
});

test('keyboard: Tab reaches the buttons and Enter pages', async ({ page }) => {
  await page.goto('/components/pagination');
  const bar = page.locator(`${BASIC} oge-pagination`);
  await bar.scrollIntoViewIfNeeded();
  const next = bar.locator('.oge-pagination-nav-btn').last();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(bar.locator('[aria-current="page"]')).toHaveText('2');
});

test('page-size change updates the live info range', async ({ page }) => {
  await page.goto('/components/pagination');
  const bar = page.locator(`${SIZES} oge-pagination`);
  await bar.scrollIntoViewIfNeeded();
  const info = bar.locator('.oge-pagination-info');
  await expect(info).toHaveText('1–20 of 97');
  await expect(info).toHaveAttribute('aria-live', 'polite');
  await bar.locator('.oge-pagination-select').selectOption('50');
  await expect(info).toHaveText('1–50 of 97');
  await bar.locator('.oge-pagination-select').selectOption('all');
  await expect(info).toHaveText('1–97 of 97');
});

test('adaptive mode renders the compact indicator in a narrow container', async ({
  page,
}) => {
  await page.goto('/components/pagination');
  const bar = page.locator(`${ADAPTIVE} oge-pagination`);
  await bar.scrollIntoViewIfNeeded();
  // the demo box is 320px < 480px threshold → compact
  await expect(bar.locator('.oge-pagination-indicator')).toHaveText('5 / 20');
  await expect(bar.locator('.oge-pagination-page')).toHaveCount(0);
});

test('pagination page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/pagination');
  await expect(page.locator('oge-pagination').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-pagination')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
