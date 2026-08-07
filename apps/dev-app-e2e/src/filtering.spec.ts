import { test, expect } from '@playwright/test';

test('operator menu, filter builder and search highlighting work together', async ({
  page,
}) => {
  await page.goto('/components/data-grid/filtering');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // filter row + operator switch
  await page.getByLabel('Filter First Name').fill('ali');
  await expect
    .poll(async () => page.locator('.oge-row').count())
    .toBeGreaterThan(0);
  await page.locator('.oge-filter-op-btn').first().click();
  await expect(page.locator('.oge-operator-menu')).toBeVisible();
  await page
    .locator('.oge-operator-menu .oge-menu-item', { hasText: 'Starts with' })
    .click();
  await expect(page.locator('.oge-operator-menu')).toHaveCount(0);

  // global search highlights matches
  await page.locator('.oge-search-input').fill('ankara');
  await expect(page.locator('mark.oge-highlight').first()).toBeVisible();
  await page.locator('.oge-search-input').fill('');
  await page.getByLabel('Filter First Name').fill('');

  // filter builder: create Salary >= 100000
  await page.locator('.oge-filter-panel-text').click();
  const popup = page.locator('.oge-builder-modal .oge-modal');
  await expect(popup).toBeVisible();
  await popup.locator('select.oge-fb-input').first().selectOption('salary');
  await popup.locator('select.oge-fb-input').nth(1).selectOption('ge');
  await popup.locator('.oge-fb-input .oge-input-native').fill('100000');
  await popup.getByRole('button', { name: 'Apply' }).click();
  await expect(popup).toHaveCount(0);

  // panel shows the readable filter and the two-way value is displayed
  await expect(page.locator('.oge-filter-panel-text')).toContainText(
    'Greater than or equal',
  );
  await expect(page.getByText('filterValue =')).toContainText('"op":"ge"');

  // clear from the panel
  await page.locator('.oge-filter-panel-clear').click();
  await expect(page.locator('.oge-filter-panel-text')).toContainText(
    'Create filter',
  );
});

test('header filter search narrows the distinct values', async ({ page }) => {
  await page.goto('/components/data-grid/filtering');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  await page.locator('.oge-header-filter-btn').nth(2).click(); // Department
  const popup = page.locator('.oge-header-filter-popup');
  await expect(popup).toBeVisible();
  const before = await popup.locator('.oge-hf-item:not(.oge-hf-all)').count();
  expect(before).toBeGreaterThan(2);

  await popup.locator('.oge-hf-search').fill('eng');
  await expect(popup.locator('.oge-hf-item:not(.oge-hf-all)')).toHaveCount(1);
  await expect(popup.locator('.oge-hf-item:not(.oge-hf-all)')).toContainText(
    'Engineering',
  );
});
