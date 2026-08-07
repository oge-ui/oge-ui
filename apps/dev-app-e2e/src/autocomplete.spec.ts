import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('autocomplete page', () => {
  test('types, filters and commits text and suggestions', async ({ page }) => {
    await page.goto('/components/inputs/autocomplete');

    const basic = page.locator('oge-autocomplete', { hasText: 'City' }).first();
    const input = basic.locator('.oge-input-native');

    // typing opens the list and filters
    await input.click();
    await input.fill('an');
    const listbox = page.locator('.oge-select-list');
    await expect(listbox).toBeVisible();
    await expect(
      page.locator('.oge-select-option', { hasText: 'Ankara' }),
    ).toBeVisible();

    // picking a suggestion writes the display text (the value IS the text)
    await page.locator('.oge-select-option', { hasText: 'Ankara' }).click();
    await expect(listbox).toBeHidden();
    await expect(input).toHaveValue('Ankara');
    await expect(basic.locator('.oge-input-native')).toBeFocused();

    // free text commits on Enter — wait for the no-data row so the typed
    // text has definitely reached the component before pressing Enter
    await input.fill('Somewhere else');
    await expect(page.locator('.oge-select-status')).toBeVisible();
    await input.press('Enter');
    await expect(listbox).toBeHidden();
    await expect(input).toHaveValue('Somewhere else');
    await expect(
      page.locator('code', { hasText: 'Somewhere else' }),
    ).toBeVisible();
  });

  test('virtual scrolling renders a bounded DOM over 10k rows', async ({
    page,
  }) => {
    await page.goto('/components/inputs/autocomplete');
    const virtual = page
      .locator('oge-autocomplete', { hasText: 'Account' })
      .first();
    const input = virtual.locator('.oge-input-native');
    await input.click();
    await input.fill('Account');
    const listbox = page.locator('.oge-select-list-virtual');
    await expect(listbox).toBeVisible();

    // bounded DOM inside a full-height spacer
    const count = await page.locator('.oge-select-option').count();
    expect(count).toBeLessThan(40);
    const spacerHeight = await page
      .locator('.oge-select-spacer')
      .evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(spacerHeight).toBeGreaterThan(9000 * 34);

    // scrolling deep swaps the window but keeps absolute indices
    await listbox.evaluate((el) => {
      el.scrollTop = 5000 * 34;
      el.dispatchEvent(new Event('scroll'));
    });
    await expect(
      page.locator('.oge-select-option', { hasText: 'Account #05001' }),
    ).toBeVisible();
  });

  test('has no axe violations with an open suggestion list', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/components/inputs/autocomplete');
    const basic = page.locator('oge-autocomplete', { hasText: 'City' }).first();
    const input = basic.locator('.oge-input-native');
    await input.click();
    await input.fill('an');
    await expect(page.locator('.oge-select-list')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('.oge-input')
      .include('.oge-popup')
      .disableRules(['color-contrast'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
