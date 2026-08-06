import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('home / landing page', () => {
  test('renders the animated hero without the docs sidebar', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Angular components/ }),
    ).toBeVisible();
    // landing renders full-bleed: no sidebar nav, no page filter box
    await expect(page.getByPlaceholder('Filter pages…')).toHaveCount(0);
    // the live demo is the real grid
    await expect(page.locator('app-home .oge-grid').first()).toBeVisible();
  });

  test('demo window tabs switch the live component', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tree-list.ts' }).click();
    await expect(page.locator('app-home oge-tree-list')).toBeVisible();
    await page.getByRole('button', { name: 'buttons.ts' }).click();
    await expect(
      page.locator('app-home oge-button', { hasText: 'Async save' }),
    ).toBeVisible();
  });

  test('CTA navigates into the docs shell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Get started', exact: true }).click();
    await expect(page).toHaveURL(/\/getting-started$/);
    // docs shell (sidebar) is back
    await expect(page.getByPlaceholder('Filter pages…')).toBeVisible();
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    const scan = () =>
      new AxeBuilder({ page })
        .include('app-home')
        .disableRules(['color-contrast'])
        .analyze();

    await page.goto('/');
    await expect(page.locator('app-home .oge-grid').first()).toBeVisible();
    let results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
