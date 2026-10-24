import AxeBuilder from './axe';
import { expect, test } from '@playwright/test';

test.describe('pricing and compare', () => {
  test('the seat calculator follows the stepper, the field and the slider', async ({
    page,
  }) => {
    await page.goto('/pricing');
    const field = page.getByLabel('Developers on the Pro packages');
    const total = page.locator('.app-calc-amount');
    await expect(field).toHaveValue('5');
    await expect(total).toHaveText('$1,495');

    await page.getByRole('button', { name: 'One developer more' }).click();
    await expect(field).toHaveValue('6');
    await expect(total).toHaveText('$1,794');

    await field.fill('12');
    await expect(total).toHaveText('$3,588');

    // clamped to at least one seat
    await field.fill('0');
    await expect(field).toHaveValue('1');
    await expect(
      page.getByRole('button', { name: 'One developer fewer' }),
    ).toBeDisabled();
  });

  test('questions open and close, the first one starts open', async ({
    page,
  }) => {
    await page.goto('/pricing');
    const first = page.locator('#is-oge-ui-free');
    const second = page.locator('#what-does-pro-cost');
    await expect(first).toHaveAttribute('open', '');
    await expect(second).not.toHaveAttribute('open', '');
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
  });

  test('price bars put OGE UI Pro first and link every comparison', async ({
    page,
  }) => {
    await page.goto('/compare');
    const bars = page.locator('.app-price-bar');
    await expect(bars).toHaveCount(5);
    await expect(bars.first()).toContainText('OGE UI Pro');
    await expect(
      page.locator('.app-price-bars').getByRole('link', { name: 'AG Grid' }),
    ).toHaveAttribute('href', '/compare/ag-grid');
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    for (const path of ['/pricing', '/compare']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      let results = await new AxeBuilder({ page })
        .include('main')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map((v) => v.id),
        path,
      ).toEqual([]);

      await page.getByLabel('Switch to dark mode').click();
      results = await new AxeBuilder({ page })
        .include('main')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map((v) => v.id),
        `${path} dark`,
      ).toEqual([]);
      await page.getByLabel('Switch to light mode').click();
    }
  });
});
