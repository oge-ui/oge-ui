import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('select box page', () => {
  test('opens, filters and selects with the combobox pattern', async ({
    page,
  }) => {
    await page.goto('/components/inputs/select-box');

    // basic select-only: open via chevron, pick an option
    const basic = page.locator('oge-select-box', { hasText: 'City' }).first();
    await basic.locator('.oge-input-dropdown').click();
    const listbox = page.locator('.oge-select-list');
    await expect(listbox).toBeVisible();
    await page.locator('.oge-select-option', { hasText: 'Lisbon' }).click();
    await expect(listbox).toBeHidden();
    await expect(basic.locator('.oge-input-native')).toHaveValue('Lisbon');

    // searchable: typing filters, committed value is the valueExpr
    const search = page
      .locator('oge-select-box', { hasText: 'Assignee' })
      .first();
    const searchInput = search.locator('.oge-input-native');
    await searchInput.click();
    await searchInput.fill('mert');
    await expect(page.locator('.oge-select-option')).toHaveCount(1);
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('Mert Demir');
    await expect(page.getByText('committed id:')).toContainText('2');
  });

  test('keyboard: arrows + Enter select without leaving the input', async ({
    page,
  }) => {
    await page.goto('/components/inputs/select-box');
    const basic = page.locator('oge-select-box', { hasText: 'City' }).first();
    const input = basic.locator('.oge-input-native');
    await input.click(); // opens (openOnFieldClick)
    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toHaveValue('Lisbon');
    await expect(input).toBeFocused();
  });

  test('has no axe violations with an open popup (light and dark)', async ({
    page,
  }) => {
    test.slow();
    const scan = () =>
      new AxeBuilder({ page })
        .include('.oge-input')
        .include('.oge-popup')
        .disableRules(['color-contrast'])
        .analyze();

    await page.goto('/components/inputs/select-box');
    await page
      .locator('oge-select-box', { hasText: 'City' })
      .first()
      .locator('.oge-input-dropdown')
      .click();
    await expect(page.locator('.oge-select-list')).toBeVisible();
    let results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
