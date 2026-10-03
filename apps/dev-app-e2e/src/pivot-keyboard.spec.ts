import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Keyboard and single-pointer alternatives to the pivot's drag & drop
 * (WCAG 2.1.1 / 2.5.7) and its single-tab-stop APG grid — in both render
 * layers, which run the same `OgePivotGridCore`.
 */
const VIEWS = [
  { name: 'Angular', query: '', host: 'oge-pivot-grid' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-pivot-grid',
  },
] as const;

const chips = (pivot: Locator, area: string) =>
  pivot.locator(`.oge-pivot-area[data-area="${area}"] .oge-pivot-field-chip`);

async function open(page: Page, query: string, host: string): Promise<Locator> {
  await page.goto(`/components/pivot-grid${query}`);
  const pivot = page.locator(host).first();
  await expect(
    pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }),
  ).toBeVisible();
  return pivot;
}

for (const view of VIEWS) {
  test.describe(`pivot keyboard (${view.name})`, () => {
    test('reorders and moves field chips with Ctrl+Arrow keys', async ({
      page,
    }) => {
      const pivot = await open(page, view.query, view.host);
      await expect(chips(pivot, 'row')).toHaveText([
        'Region',
        'Country',
        'City',
      ]);
      const region = chips(pivot, 'row').filter({ hasText: 'Region' });
      await region.focus();
      await page.keyboard.press('Control+ArrowRight');
      await expect(chips(pivot, 'row')).toHaveText([
        'Country',
        'Region',
        'City',
      ]);
      // focus follows the moved chip, and the move is announced
      await expect(
        pivot.locator('.oge-pivot-field-chip:focus', { hasText: 'Region' }),
      ).toBeVisible();
      await expect(pivot.locator('.oge-pivot-live')).toHaveText(
        'Region moved to Rows, position 2 of 3',
      );
      // the outer row level re-pivots to countries
      await expect(
        pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' }),
      ).toBeVisible();

      // Ctrl+Up moves it to the previous area (Filters)
      await page.keyboard.press('Control+ArrowUp');
      await expect(chips(pivot, 'filter')).toHaveText(['Region']);
      await expect(
        pivot.locator('[data-area="filter"] .oge-pivot-field-chip:focus'),
      ).toHaveCount(1);
    });

    test('moves a field through its menu without dragging', async ({
      page,
    }) => {
      const pivot = await open(page, view.query, view.host);
      const city = chips(pivot, 'row').filter({ hasText: 'City' });
      await city.focus();
      await page.keyboard.press('Enter');
      const menu = pivot.getByRole('menu', { name: 'City field actions' });
      await expect(menu).toBeVisible();
      await expect(
        menu.getByRole('menuitem', { name: 'Move left' }),
      ).toBeFocused();
      // Escape returns focus to the chip
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(city).toBeFocused();

      await page.keyboard.press('Shift+F10');
      await expect(menu).toBeVisible();
      await menu.getByRole('menuitem', { name: 'Move to Columns' }).click();
      await expect(chips(pivot, 'column')).toHaveText(['Year', 'City']);
      await expect(
        pivot.locator('[data-area="column"] .oge-pivot-field-chip:focus', {
          hasText: 'City',
        }),
      ).toBeVisible();

      // a single right-click offers the same menu (pointer alternative)
      await chips(pivot, 'column')
        .filter({ hasText: 'City' })
        .click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Remove field' }).click();
      await expect(chips(pivot, 'column')).toHaveText(['Year']);
    });

    test('headers and value cells share one tab stop', async ({ page }) => {
      const pivot = await open(page, view.query, view.host);
      const matrix = pivot.locator('.oge-pivot-matrix');
      await expect(matrix.locator('[tabindex="0"]')).toHaveCount(1);
      await expect(matrix.locator('[tabindex="0"]')).toHaveAttribute(
        'data-cell',
        '0-0',
      );
      await matrix.locator('[data-cell="0-0"]').focus();
      await page.keyboard.press('ArrowLeft');
      // the first value row's header (the first row-header element)
      const firstRow = matrix.locator('.oge-pivot-row-header').first();
      await expect(firstRow).toBeFocused();
      await expect(firstRow).toHaveAttribute('aria-expanded', 'false');
      await expect(matrix.locator('[tabindex="0"]')).toHaveCount(1);
      // Enter expands from the keyboard; focus stays on the header
      await page.keyboard.press('Enter');
      await expect(firstRow).toHaveAttribute('aria-expanded', 'true');
      await expect(firstRow).toBeFocused();
      // Ctrl+Home reaches the first column header
      await page.keyboard.press('Control+Home');
      await expect(
        pivot.locator('.oge-pivot-col-header').first(),
      ).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(matrix.locator('[data-cell="0-0"]')).toBeFocused();

      const results = await new AxeBuilder({ page })
        .include(view.name === 'React' ? 'app-react-host' : 'oge-pivot-grid')
        // the empty corner header is a known, recorded exception (react-pivot.spec)
        .disableRules(['color-contrast', 'empty-table-header'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
