import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * The multi-column combo box in both render layers: the same page, the same
 * APG combobox-with-grid behaviour, the same axe bar.
 */
const VIEWS = [
  { name: 'Angular', query: '', host: 'oge-multi-column-combo-box' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-multi-column-combo-box',
  },
] as const;

const scan = (page: Page) =>
  new AxeBuilder({ page })
    .include('.oge-multi-column-combo-box')
    .include('.oge-popup')
    .disableRules(['color-contrast'])
    .analyze();

for (const view of VIEWS) {
  test.describe(`multi-column combo box (${view.name})`, () => {
    test('opens a grid popup and commits a row from the keyboard', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/multi-column-combo-box${view.query}`);
      const field = page.locator(view.host).first();
      const input = field.locator('input[role="combobox"]');
      await expect(input).toHaveAttribute('aria-haspopup', 'grid');
      await expect(input).toHaveValue('Monitor arm');

      await input.click();
      const grid = page.locator('.oge-mccb-grid[role="grid"]');
      await expect(grid).toBeVisible();
      await expect(grid.getByRole('columnheader')).toHaveText([
        'SKU',
        'Name',
        'Category',
        'Price',
      ]);
      await expect(input).toHaveAttribute('aria-controls', /-grid$/);

      await input.press('ArrowDown'); // Monitor arm → Standing desk
      await input.press('ArrowRight');
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        /-cell-3-1$/,
      );
      await expect(page.locator('.oge-mccb-cell-active')).toHaveText(
        'Standing desk',
      );
      await input.press('Enter');
      await expect(grid).toBeHidden();
      await expect(input).toHaveValue('Standing desk');
    });

    test('searches across columns and stays axe-clean while open', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/multi-column-combo-box${view.query}`);
      const input = page
        .locator(view.host)
        .first()
        .locator('input[role="combobox"]');
      await input.fill('accessories');
      const rows = page.locator('.oge-mccb-row.oge-select-option');
      await expect(rows).toHaveCount(2);
      const results = await scan(page);
      expect(results.violations).toEqual([]);
    });

    test('multiple mode keeps the popup open and renders chips', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/multi-column-combo-box${view.query}`);
      const bundle = page.locator(view.host).nth(2);
      await expect(bundle.locator('.oge-tag')).toHaveCount(2);
      await bundle.locator('.oge-input-dropdown').click();
      await page
        .locator('.oge-mccb-row.oge-select-option', { hasText: 'Desk lamp' })
        .click();
      await expect(page.locator('.oge-mccb-grid')).toBeVisible();
      await expect(bundle.locator('.oge-tag-text')).toHaveText(['Monitor arm']);
    });

    test('remote rows page in as the grid scrolls', async ({ page }) => {
      await page.goto(`/components/inputs/multi-column-combo-box${view.query}`);
      const remote = page.locator(view.host).nth(3);
      await remote.locator('.oge-input-dropdown').click();
      const grid = page.locator('.oge-mccb-grid');
      await expect(
        grid.locator('.oge-mccb-row.oge-select-option').first(),
      ).toContainText('AC-00001');
      await expect(grid).toHaveAttribute('aria-rowcount', '10001');
      // past the first page of 50: the next page has landed
      await expect(async () => {
        await grid.evaluate((el) => (el.scrollTop = el.scrollHeight));
        const codes = await grid
          .locator('.oge-mccb-row.oge-select-option .oge-mccb-cell:first-child')
          .allTextContents();
        expect(
          Math.max(...codes.map((code) => Number(code.replace(/\D/g, '')))),
        ).toBeGreaterThan(50);
      }).toPass({ timeout: 15000 });
    });
  });
}
