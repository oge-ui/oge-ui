import { test, expect } from '@playwright/test';

test('dark mode switches the docs and the grid together', async ({ page }) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  const headerBg = () =>
    page
      .locator('.oge-header-cell')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  const lightBg = await headerBg();

  await page.getByLabel('Switch to dark mode').click();
  await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
  await expect(page.locator('html')).toHaveClass(/dark/);
  // grid header follows the dark tokens (#1f2937)
  await expect.poll(headerBg).toBe('rgb(31, 41, 55)');
  expect(lightBg).not.toBe('rgb(31, 41, 55)');

  await page.getByLabel('Switch to light mode').click();
  await expect.poll(headerBg).toBe(lightBg);
});
