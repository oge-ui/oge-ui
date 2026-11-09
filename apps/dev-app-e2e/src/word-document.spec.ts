import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

/** The React view is the same route with `?framework=react`. */
for (const view of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
]) {
  test.describe(`Word preview (${view.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/spreadsheet/word${view.query}`);
      await expect(page.locator('.oge-word-page').first()).toBeVisible();
    });

    test('lays out the pages and moves between them', async ({ page }) => {
      const viewer = page.locator('.oge-word').first();
      const pages = viewer.locator('.oge-word-page');
      await expect(pages).toHaveCount(5);
      await expect(pages.first().locator('text').first()).toBeVisible();
      await expect(viewer.locator('[aria-live]')).toHaveText('Page 1 of 5');

      await viewer.getByRole('button', { name: 'Next page' }).click();
      await expect(viewer.locator('[aria-live]')).toHaveText('Page 2 of 5');

      await viewer.focus();
      await page.keyboard.press('End');
      await expect(viewer.locator('[aria-live]')).toHaveText('Page 5 of 5');
      await expect(pages.nth(4).locator('text').first()).toBeVisible();
    });

    test('draws a far page only when it comes near', async ({ page }) => {
      const viewer = page.locator('.oge-word').first();
      const last = viewer.locator('.oge-word-page').nth(4);
      await expect(last.locator('svg')).toHaveCount(0);
      await last.scrollIntoViewIfNeeded();
      await expect(last.locator('text').first()).toBeVisible();
    });

    test('keeps the page proportions', async ({ page }) => {
      const box = await page.locator('.oge-word-page').first().boundingBox();
      expect((box?.height ?? 0) / (box?.width ?? 1)).toBeCloseTo(
        841.9 / 595.3,
        1,
      );
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include('.oge-word')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
