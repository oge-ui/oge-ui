import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the pivot-grid family (ADR 0002/0003 +
 * `docs/REACT-PARITY.md`). Every page renders the real React pivot on the
 * same route the Angular view uses — no page may fall back to silent Angular
 * content — the shared engine drives expansion, the field panel and the
 * chooser, and the pages are axe-clean.
 */
const REACT = '?framework=react';

test.describe('React pivot-grid docs', () => {
  test('the overview mounts the React pivot without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/pivot-grid${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    // the React view renders no Angular pivot
    await expect(page.locator('oge-pivot-grid')).toHaveCount(0);
    const pivot = page.locator('app-react-host .oge-pivot-grid').first();
    await expect(pivot).toBeVisible();
    await expect(
      pivot.locator('.oge-pivot-row-header', { hasText: 'Grand Total' }),
    ).toBeVisible();
    await expect(
      pivot.locator('.oge-pivot-col-header', { hasText: 'Grand Total' }),
    ).toBeVisible();
    const collapsedRows = await pivot.locator('.oge-pivot-row-header').count();

    // expanding a region keeps its line (with subtotals) and adds countries
    await pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }).click();
    await expect(
      pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' }),
    ).toBeVisible();
    expect(
      await pivot.locator('.oge-pivot-row-header').count(),
    ).toBeGreaterThan(collapsedRows);
    await expect(
      pivot.locator('.oge-pivot-row-header.oge-pivot-total', {
        hasText: 'Europe',
      }),
    ).toBeVisible();

    // a cell click reports its coordinates through React state (labels sort
    // ascending, so the first line is Americas)
    await pivot.locator('.oge-pivot-cell').first().click();
    await expect(page.getByText(/\[Americas\] × \[2022\]/)).toBeVisible();

    await expect(pivot.locator('.oge-pivot-area')).toHaveCount(4);
    await expect(
      pivot.locator('.oge-pivot-field-chip', { hasText: 'Region' }),
    ).toBeVisible();
  });

  test('analytics: the virtual pivot aligns cells, the chooser opens from the handle', async ({
    page,
  }) => {
    await page.goto(`/components/pivot-grid/analytics${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const pivot = page.locator('app-react-host .oge-pivot-grid').first();
    await expect(
      pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }),
    ).toBeVisible();
    await expect(pivot.locator('.oge-pivot-cell').first()).toHaveAttribute(
      'data-cell',
      /\d+-\d+/,
    );
    const grandHeader = pivot
      .locator('.oge-pivot-col-header', { hasText: 'Grand Total' })
      .first();
    const grandCell = pivot.locator('.oge-pivot-cell.oge-pivot-grand').first();
    const headerBox = await grandHeader.boundingBox();
    const cellBox = await grandCell.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(cellBox).not.toBeNull();
    if (headerBox && cellBox) {
      expect(Math.abs(headerBox.x - cellBox.x)).toBeLessThan(2);
      expect(Math.abs(headerBox.width - cellBox.width)).toBeLessThan(2);
    }

    await page.getByRole('button', { name: 'Field chooser' }).click();
    const chooser = page.locator('.oge-pivot-chooser');
    await expect(chooser).toBeVisible();
    await chooser.locator('.oge-tool-text-btn').last().click();
    await expect(chooser).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excel' })).toBeVisible();
  });

  test('a header context menu sorts through the shared engine', async ({
    page,
  }) => {
    await page.goto(`/components/pivot-grid${REACT}`);
    const pivot = page.locator('app-react-host .oge-pivot-grid').first();
    const firstRow = pivot.locator('.oge-pivot-row-header').first();
    await expect(firstRow).toHaveText('Americas');
    await firstRow.click({ button: 'right' });
    await pivot.getByRole('menuitem', { name: 'Sort Z to A' }).click();
    await expect(pivot.getByRole('menu')).toHaveCount(0);
    await expect(pivot.locator('.oge-pivot-row-header').first()).toHaveText(
      'Europe',
    );
    await expect(pivot.locator('.oge-pivot-row-header').nth(1)).toHaveText(
      'Asia',
    );
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/pivot-grid/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '<OgePivotGrid>' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'OgePivotFieldDef' }),
    ).toBeVisible();
  });

  for (const path of [
    '/components/pivot-grid',
    '/components/pivot-grid/analytics',
    '/components/pivot-grid/api',
  ]) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // empty-table-header: the matrix's top-left corner is a structural
      // columnheader with no text — the same markup the Angular pivot
      // renders; a best-practice flag, not a WCAG failure (react-grid does
      // the same for its utility columns).
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order', 'empty-table-header'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
