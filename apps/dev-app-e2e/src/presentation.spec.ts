import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

/** The React view is the same route with `?framework=react`. */
for (const view of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
]) {
  test.describe(`PowerPoint preview (${view.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/spreadsheet/powerpoint${view.query}`);
      await expect(
        page.locator('.oge-presentation-stage').first(),
      ).toBeVisible();
    });

    test('draws the deck and moves between slides', async ({ page }) => {
      const viewer = page.locator('.oge-presentation').first();
      const stage = viewer.locator('.oge-presentation-stage');
      await expect(viewer.locator('.oge-presentation-thumb')).toHaveCount(5);
      await expect(stage).toHaveAttribute('aria-label', 'Slide 1 of 5');
      await expect(stage.locator('text').first()).toHaveText(
        'Quarterly results',
      );

      await viewer.getByRole('button', { name: 'Next slide' }).click();
      await expect(stage).toHaveAttribute('aria-label', 'Slide 2 of 5');

      await viewer.focus();
      await page.keyboard.press('End');
      await expect(stage).toHaveAttribute('aria-label', 'Slide 5 of 5');
      await expect(
        viewer.getByRole('button', { name: 'Next slide' }),
      ).toBeDisabled();

      await viewer.getByRole('button', { name: 'Slide 4 of 5' }).click();
      await expect(stage).toHaveAttribute('aria-label', 'Slide 4 of 5');
      await expect(stage.locator('image')).toHaveCount(1);
    });

    test('keeps the slide aspect ratio', async ({ page }) => {
      const box = await page
        .locator('.oge-presentation-stage svg')
        .first()
        .evaluate((svg) => {
          const shape = (svg as SVGSVGElement).getScreenCTM();
          return shape ? { a: shape.a, d: shape.d } : null;
        });
      expect(box?.a).toBeCloseTo(box?.d ?? 0, 5);
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include('.oge-presentation')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
