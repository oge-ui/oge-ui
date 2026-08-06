import { test, expect } from '@playwright/test';

test('persistence page: capture/restore and stateChange counter work', async ({
  page,
}) => {
  await page.goto('/components/data-grid/persistence');
  const grid = page.locator('oge-grid').nth(2); // imperative demo grid
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // sort → stateChange fires and the payload panel fills
  await grid.locator('.oge-header-cell', { hasText: 'First Name' }).click();
  await expect(page.getByText(/stateChange fired\s+[1-9]/)).toBeVisible({
    timeout: 10_000,
  });

  // capture the sorted view, clear the sort, then restore it
  await page.getByRole('button', { name: 'Capture view' }).click();
  await grid.locator('.oge-header-cell', { hasText: 'First Name' }).click(); // desc
  await grid.locator('.oge-header-cell', { hasText: 'First Name' }).click(); // cleared
  await expect(
    grid.locator('.oge-header-cell', { hasText: 'First Name' }),
  ).not.toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('button', { name: 'Restore captured view' }).click();
  await expect(
    grid.locator('.oge-header-cell', { hasText: 'First Name' }),
  ).toHaveAttribute('aria-sort', 'ascending');
});
