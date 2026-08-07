import { test, expect } from '@playwright/test';

test('CSV and Excel exports download files with the current view', async ({
  page,
}) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toBe('employees.csv');

  // Excel arrives via the lazy-loaded export-excel entry point
  const xlsxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  expect((await xlsxDownload).suggestedFilename()).toBe('employees.xlsx');
});
