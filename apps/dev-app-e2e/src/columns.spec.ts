import { test, expect } from '@playwright/test';

test('banded headers, lookup display and adaptive hiding', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/components/data-grid/columns');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // band row spans the Person columns
  const band = page.locator('.oge-band-cell.oge-band-filled');
  await expect(band).toHaveText('Person');

  // initial sortOrder="desc" on Id
  await expect(page.locator('.oge-header-cell').first()).toHaveAttribute('aria-sort', 'descending');
  await expect(page.locator('.oge-row').first().locator('.oge-cell').first()).toHaveText('200');

  // lookup column renders labels, not codes
  const departmentCell = page.locator('.oge-row').first().locator('.oge-cell').nth(3);
  await expect(departmentCell).not.toHaveText(/Engineering|Sales|HR|Finance|Support/);

  // adaptive: shrink → City (priority 0) hides first
  await expect(page.locator('.oge-header-caption', { hasText: 'City' })).toBeVisible();
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(page.locator('.oge-header-caption', { hasText: 'City' })).toHaveCount(0);

  await page.setViewportSize({ width: 1400, height: 900 });
  await expect(page.locator('.oge-header-caption', { hasText: 'City' })).toBeVisible();
});

test('lookup editor commits the raw value but shows the label', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/components/data-grid/columns');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  const departmentCell = page.locator('.oge-row').first().locator('.oge-cell').nth(3);
  await departmentCell.click();
  const editor = page.locator('select.oge-editor');
  await expect(editor).toBeVisible();
  await editor.selectOption({ label: 'Finans' });
  await editor.press('Enter');
  await expect(departmentCell).toHaveText('Finans');
});
