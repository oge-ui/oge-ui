import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

/** The React view is the same route with `?framework=react`. */
for (const view of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
]) {
  test.describe(`PDF viewer (${view.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/spreadsheet/pdf${view.query}`);
      // pdf.js (a lazy chunk plus its worker) loads on the first document
      await expect(page.locator('.oge-pdf-page').first()).toBeVisible({
        timeout: 20_000,
      });
    });

    test('draws the pages with pdf.js and moves between them', async ({
      page,
    }) => {
      const viewer = page.locator('.oge-pdf').first();
      await expect(viewer.locator('.oge-pdf-page')).toHaveCount(3);
      await expect(viewer.locator('.oge-pdf-page-label')).toHaveText(
        'Page 1 of 3',
      );
      // pdf.js drew real pixels into the first canvas
      await expect
        .poll(() =>
          viewer
            .locator('.oge-pdf-page canvas')
            .first()
            .evaluate((canvas: HTMLCanvasElement) => canvas.width),
        )
        .toBeGreaterThan(100);
      // and laid its text layer over it, for selection and screen readers
      await expect(
        viewer.locator('.oge-pdf-text').first().getByText('Quarterly report'),
      ).toHaveCount(1);

      await viewer.getByRole('button', { name: 'Next page' }).click();
      await expect(viewer.locator('.oge-pdf-page-label')).toHaveText(
        'Page 2 of 3',
      );
      await viewer.locator('.oge-pdf-scroller').focus();
      await page.keyboard.press('End');
      await expect(viewer.locator('.oge-pdf-page-label')).toHaveText(
        'Page 3 of 3',
      );
    });

    test('finds text and steps through the matches', async ({ page }) => {
      const viewer = page.locator('.oge-pdf').first();
      const find = viewer.getByRole('searchbox', { name: 'Find in document' });
      await find.fill('revenue');
      await expect(viewer.locator('.oge-pdf-match-label')).toHaveText(
        /^1 of \d+$/,
        // the first search reads every page's text once
        { timeout: 15_000 },
      );
      const total = Number(
        (await viewer.locator('.oge-pdf-match-label').textContent())?.split(
          ' of ',
        )[1],
      );
      expect(total).toBeGreaterThan(1);
      await expect(viewer.locator('.oge-pdf-highlight-current')).toHaveCount(1);
      await find.press('Enter');
      await expect(viewer.locator('.oge-pdf-match-label')).toHaveText(
        `2 of ${total}`,
      );
      await find.press('Shift+Enter');
      await expect(viewer.locator('.oge-pdf-match-label')).toHaveText(
        `1 of ${total}`,
      );
    });

    test('zooms and fits', async ({ page }) => {
      const viewer = page.locator('.oge-pdf').first();
      const first = viewer.locator('.oge-pdf-page').first();
      const before = (await first.boundingBox())?.width ?? 0;
      await viewer.getByRole('button', { name: 'Fit page' }).click();
      await expect(
        viewer.getByRole('button', { name: 'Fit page' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect
        .poll(async () => (await first.boundingBox())?.width ?? 0)
        .toBeLessThan(before);
      await viewer.getByRole('button', { name: 'Zoom in' }).click();
      await expect(viewer.locator('.oge-pdf-zoom-label')).toHaveText(/^\d+%$/);
    });

    test('opens the thumbnails of the controlled demo', async ({ page }) => {
      const viewer = page.locator('.oge-pdf').nth(1);
      const thumbs = viewer.locator('.oge-pdf-thumbnail');
      await expect(thumbs).toHaveCount(3);
      await thumbs.nth(2).click();
      await expect(viewer.locator('.oge-pdf-page-label')).toHaveText(
        'Page 3 of 3',
      );
      await expect(thumbs.nth(2)).toHaveAttribute('aria-current', 'page');
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include('.oge-pdf')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
