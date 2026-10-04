import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * G1b pages — rich grid exports, tree-list summaries + remote filtering,
 * pivot chart integration and calculated fields — in both render layers.
 * The React view mounts the real React components on the same routes.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

async function download(page: Page, testId: string): Promise<string> {
  const pending = page.waitForEvent('download');
  await page.getByTestId(testId).first().click();
  return (await pending).suggestedFilename();
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: G1b analysis & export pages`, () => {
    test('data grid: Excel, selected-rows Excel and PDF download', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/export${layer.query}`);
      await expect(page.locator('.oge-row').first()).toBeVisible();
      // grouped by department with a band header over the name columns
      await expect(page.locator('.oge-group-row').first()).toBeVisible();
      await expect(
        page.locator('.oge-band-row', { hasText: 'Employee' }).first(),
      ).toBeVisible();
      expect(await download(page, 'export-excel')).toBe('employees.xlsx');
      expect(await download(page, 'export-excel-selected')).toBe(
        'employees-selected.xlsx',
      );
      expect(await download(page, 'export-pdf')).toBe('employees.pdf');
    });

    test('tree list: footer totals, per-parent badges, exports and remote filtering', async ({
      page,
    }) => {
      await page.goto(`/components/tree-list/summaries${layer.query}`);
      const tree = page.locator('.oge-tree-list').first();
      const footer = tree.locator('.oge-total-row');
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('Count: 52');
      await expect(footer).toContainText('Sum:');
      await expect(
        tree.locator('.oge-tree-node-summary').first(),
      ).toBeVisible();
      expect(await download(page, 'tree-export-excel')).toBe('plan.xlsx');
      expect(await download(page, 'tree-export-pdf')).toBe('plan.pdf');

      // the second tree filters on the (fake) server
      const remote = page.locator('.oge-tree-list').nth(1);
      await expect(page.getByTestId('tree-remote-log')).toContainText('load');
      const search = remote.getByRole('searchbox').first();
      await search.fill('launch');
      await expect(page.getByTestId('tree-remote-log')).toContainText(
        'filtered load',
      );
      await expect(
        remote.locator('.oge-tree-cell-text', { hasText: 'Launch' }).first(),
      ).toBeVisible();
    });

    test('pivot: the linked chart follows the pivot', async ({ page }) => {
      await page.goto(`/components/pivot-grid/chart-integration${layer.query}`);
      const chart = page.getByTestId('pivot-chart').first();
      await expect(chart.locator('svg').first()).toBeVisible();
      const pivot = page.locator('.oge-pivot-grid').first();
      await expect(
        pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }),
      ).toBeVisible();
      // expanding a region re-shapes the chart's arguments
      await pivot
        .locator('.oge-pivot-row-header', { hasText: 'Europe' })
        .click();
      await expect(
        pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' }),
      ).toBeVisible();
      await expect(chart).toContainText('Europe / Germany');
    });

    test('pivot: calculated measures, member filters, layouts and PDF', async ({
      page,
    }) => {
      await page.goto(`/components/pivot-grid/calculated-fields${layer.query}`);
      const calc = page.locator('.oge-pivot-grid').first();
      await expect(calc.locator('.oge-pivot-cell').first()).toBeVisible();
      // four calculated measures beside Amount and Units in every cell
      await expect(
        calc.locator('.oge-pivot-cell').first().locator('.oge-pivot-measure'),
      ).toHaveCount(6);
      await expect(calc).toContainText('%');
      expect(await download(page, 'pivot-export-pdf')).toBe('sales.pdf');

      // Top 3 countries + tabular layout: label columns in the corner
      // (Angular tags the grid host, React a wrapper — both contain the matrix)
      const host = page.getByTestId('pivot-filters');
      await expect(
        host.locator('.oge-pivot-rh-segments').first(),
      ).toBeVisible();
      await expect(host.locator('.oge-pivot-corner')).toContainText('Region');
      await expect(host.locator('.oge-pivot-corner')).toContainText('Country');
      await page.getByRole('button', { name: 'compact' }).click();
      await expect(host.locator('.oge-pivot-rh-segments')).toHaveCount(0);
    });

    for (const path of [
      '/components/data-grid/export',
      '/components/tree-list/summaries',
      '/components/pivot-grid/chart-integration',
      '/components/pivot-grid/calculated-fields',
    ]) {
      test(`${path} has no axe violations`, async ({ page }) => {
        test.slow();
        await page.goto(`${path}${layer.query}`);
        await expect(page.locator('h1').first()).toBeVisible();
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .disableRules([
            'color-contrast',
            'heading-order',
            'empty-table-header',
          ])
          .analyze();
        expect(results.violations, `axe violations on ${path}`).toEqual([]);
      });
    }
  });
}
