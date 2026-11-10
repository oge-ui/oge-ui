import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

test.describe('select box page', () => {
  test(
    'opens, filters and selects with the combobox pattern',
    { tag: '@smoke' },
    async ({ page }) => {
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
    },
  );

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

for (const layer of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const) {
  test(`tag box compact display (${layer.name}): count and text summaries`, async ({
    page,
  }) => {
    await page.goto(`/components/inputs/select-box${layer.query}`);
    const demo = page.locator('[data-demo="tag-compact"]');
    const [count, text] = [
      demo.locator('.oge-tag-summary').nth(0),
      demo.locator('.oge-tag-summary').nth(1),
    ];
    await expect(count).toHaveText('3 selected');
    await expect(count).toHaveAttribute('title', 'Ankara, Berlin, Cairo');
    await expect(text).toHaveText('Ankara, Berlin, Cairo');
    const combo = demo.getByRole('combobox', { name: 'Count' });
    const id = await count.getAttribute('id');
    await expect(combo).toHaveAttribute(
      'aria-describedby',
      new RegExp(`(^| )${id}( |$)`),
    );
    // the field keeps its one-line height
    const height = (await combo.boundingBox())?.height ?? 0;
    expect(height).toBeLessThan(40);
  });
}
