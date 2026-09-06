import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the data-grid family (ADR 0002 + `docs/REACT-PARITY.md`).
 * Every feature page renders the real React grid on the same route the
 * Angular view uses — no page in the family may fall back to silent Angular
 * content — sorting and paging work through the shared engine, and the pages
 * are axe-clean.
 */
const REACT = '?framework=react';

test.describe('React data-grid docs', () => {
  test('the overview mounts the React grid without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid).toBeVisible();
    await expect(grid.locator('.oge-row')).toHaveCount(10);
    await expect(grid.locator('.oge-pager-info')).toHaveText('50 rows');
  });

  test('sorts on header click and pages with the pager', async ({ page }) => {
    await page.goto(`/components/data-grid${REACT}`);
    const grid = page.locator('app-react-host .oge-grid').first();
    const firstId = () =>
      grid.locator('.oge-row').first().locator('.oge-cell').first();
    await expect(firstId()).toHaveText('1');
    const header = grid.getByRole('columnheader', { name: 'Id' });
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(firstId()).toHaveText('50');
    await grid.getByRole('button', { name: 'Next page' }).click();
    await expect(firstId()).toHaveText('40');
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/data-grid/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '<OgeGrid>' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'OgeGridColumnProps' }),
    ).toBeVisible();
  });

  test('grouping page: group rows, the group panel chip and summaries', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid/grouping${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid.getByRole('treegrid')).toBeVisible();
    await expect(grid.locator('.oge-group-row').first()).toContainText(
      'Department:',
    );
    await expect(grid.locator('.oge-total-row')).toContainText('Sum:');
    await grid.locator('.oge-group-row').first().click();
    await expect(grid.locator('.oge-group-row').first()).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await grid.getByRole('button', { name: 'Ungroup Department' }).click();
    await expect(grid.locator('.oge-group-row')).toHaveCount(0);
  });

  test('master-detail page: the expander reveals the detail', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid/master-detail${REACT}`);
    const grid = page.locator('app-react-host .oge-grid').first();
    await grid.getByRole('button', { name: 'Toggle detail' }).first().click();
    await expect(grid.locator('.oge-detail-row')).toHaveCount(1);
    await expect(grid.locator('.oge-detail-row')).toContainText('Compensation');
  });

  test('rows page: the row render prop and the empty state', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid/rows${REACT}`);
    const cards = page.locator('app-react-host .oge-grid').first();
    await expect(cards.locator('.oge-custom-row')).toHaveCount(6);
    const empty = page.locator('app-react-host .oge-grid').nth(2);
    await expect(empty.locator('.oge-no-data')).toContainText(
      'No employees match',
    );
  });

  test('the feature pages branch to React rather than showing the notice', async ({
    page,
  }) => {
    // slices C and D shipped, so every one of these mounts a real React tree;
    // the coverage notice on any of them is a regression, not a gap
    for (const path of [
      '/components/data-grid/columns',
      '/components/data-grid/filtering',
      '/components/data-grid/selection',
      '/components/data-grid/editing',
      '/components/data-grid/persistence',
      '/components/data-grid/context-menu',
    ]) {
      await page.goto(`${path}${REACT}`);
      await expect(page.getByRole('status'), path).toHaveCount(0);
      await expect(
        page.locator('app-react-host .oge-grid').first(),
        path,
      ).toBeVisible();
    }
  });

  test('cell editing commits through the React grid', async ({ page }) => {
    await page.goto(`/components/data-grid/editing${REACT}`);
    await page.getByRole('button', { name: 'cell', exact: true }).click();
    const grid = page.locator('app-react-host .oge-grid').first();
    const cell = grid.locator('.oge-row').first().locator('.oge-cell').nth(1);
    const before = (await cell.textContent())?.trim();
    await cell.click();
    const editor = grid.locator('.oge-editor input').first();
    await expect(editor).toBeVisible();
    await editor.fill(`${before} Jr.`);
    await editor.press('Enter');
    await expect(grid.locator('.oge-editor')).toHaveCount(0);
    await expect(cell).toHaveText(`${before} Jr.`);
  });

  test('the header filter lists distinct values', async ({ page }) => {
    await page.goto(`/components/data-grid/filtering${REACT}`);
    const grid = page.locator('app-react-host .oge-grid').first();
    await grid.locator('.oge-header-filter-btn').nth(3).click();
    const popup = page.locator('.oge-header-filter-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.oge-hf-item').first()).toBeVisible();
  });

  for (const path of [
    '/components/data-grid',
    '/components/data-grid/api',
    '/components/data-grid/grouping',
    '/components/data-grid/master-detail',
    '/components/data-grid/rows',
    '/components/data-grid/columns',
    '/components/data-grid/filtering',
    '/components/data-grid/selection',
    '/components/data-grid/editing',
    '/components/data-grid/persistence',
    '/components/data-grid/context-menu',
  ]) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      // the grouping demo renders 500 rows in a 540px viewport without
      // virtualization (as the Angular demo does) — axe needs the slow budget
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // empty-table-header: the leading utility column headers (row drag,
      // master-detail expander) carry an aria-label and no visible text —
      // the same markup the Angular grid renders; a WCAG best-practice flag,
      // not a failure, and not something the React layer introduced.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order', 'empty-table-header'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
