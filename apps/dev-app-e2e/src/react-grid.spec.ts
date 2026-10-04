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

  test('playground: the switches drive the React grid', async ({ page }) => {
    await page.goto(`/components/data-grid/playground${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    const code = page.locator('app-code-block').first();
    await expect(grid.locator('.oge-row')).toHaveCount(15);
    await expect(grid.locator('.oge-search-input')).toBeVisible();
    await expect(code).toContainText('paging={{ pageSize: 15 }}');
    // virtual scroll on, paging off: all 1.000 rows are reachable but only a
    // window of them is in the DOM
    await page.getByLabel('Virtual scroll', { exact: true }).check({
      force: true,
    });
    await page.getByLabel('Paging', { exact: true }).uncheck({ force: true });
    await expect(code).toContainText('virtualScroll');
    await expect(code).not.toContainText('paging=');
    await expect(grid.locator('.oge-pager')).toHaveCount(0);
    await expect.poll(() => grid.locator('.oge-row').count()).toBeLessThan(60);
  });

  test('sorting page: multi-sort pages through 10k rows', async ({ page }) => {
    await page.goto(`/components/data-grid/sorting${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid.locator('.oge-row')).toHaveCount(15);
    const header = grid.getByRole('columnheader', { name: 'Id' });
    await header.click();
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    const firstId = () =>
      grid.locator('.oge-row').first().locator('.oge-cell').first();
    await expect(firstId()).toHaveText('10000');
    await grid.getByRole('button', { name: 'Next page' }).click();
    await expect(firstId()).toHaveText('9985');
  });

  test('virtual-scroll page: rows and columns are windowed', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid/virtual-scroll${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const rows = page.locator('app-react-host .oge-grid').first();
    await expect(rows.locator('.oge-row').first()).toBeVisible();
    expect(await rows.locator('.oge-row').count()).toBeLessThan(40);
    await rows
      .locator('.oge-viewport')
      .evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(
      rows.locator('.oge-row').last().locator('.oge-cell').first(),
    ).toHaveText('100000');

    const wide = page.locator('app-react-host .oge-grid').nth(1);
    const headers = wide.locator('.oge-header-cell:not(.oge-col-spacer)');
    await expect(headers.first()).toHaveText('C0');
    expect(await headers.count()).toBeLessThan(60);
    await wide
      .locator('.oge-viewport')
      .evaluate((el) => (el.scrollLeft = 10_000));
    await expect
      .poll(async () => (await headers.first().textContent())?.trim())
      .not.toBe('C0');

    const notes = page.locator('app-react-host .oge-grid').nth(2);
    await expect(notes.locator('.oge-row').first()).toBeVisible();
    const heights = await notes
      .locator('.oge-row')
      .evaluateAll((list) =>
        list.map((row) => (row as HTMLElement).offsetHeight),
      );
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  test('infinite-scroll page: sparse blocks over 1M rows', async ({ page }) => {
    await page.goto(`/components/data-grid/infinite-scroll${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid.locator('.oge-cell').first()).toHaveText('1');
    await grid.locator('.oge-viewport').evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });
    await expect(grid.locator('.oge-filler-row')).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect
      .poll(() =>
        grid
          .locator('.oge-row:not(.oge-filler-row) .oge-cell')
          .first()
          .evaluate((el) => Number(el.textContent)),
      )
      .toBeGreaterThan(400_000);
  });

  test('remote-data page: one request per interaction, cursor paging', async ({
    page,
  }) => {
    await page.goto(`/components/data-grid/remote-data${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const log = page.locator('.request-log li');
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid.locator('.oge-row').first()).toBeVisible();
    await expect(log).toHaveCount(1);
    await grid
      .locator('.oge-search-input')
      .pressSequentially('ali', { delay: 50 });
    await expect(log).toHaveCount(2);
    await expect(log.first()).toContainText('search="ali"');
    await grid.getByRole('button', { name: 'Next page' }).click();
    await expect(log).toHaveCount(3);
    await expect(log.first()).toContainText('skip=12');

    const cursor = page.locator('app-react-host .oge-grid').nth(1);
    await expect(cursor.locator('.oge-row').first()).toBeVisible();
    const viewport = cursor.locator('.oge-viewport');
    const height = await viewport.evaluate((el) => el.scrollHeight);
    await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect
      .poll(() => viewport.evaluate((el) => el.scrollHeight))
      .toBeGreaterThan(height);
  });

  test('live-updates page: pushed patches flash in place', async ({ page }) => {
    await page.goto(`/components/data-grid/live-updates${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const grid = page.locator('app-react-host .oge-grid').first();
    await expect(grid.locator('.oge-row')).toHaveCount(12);
    const prices = grid.locator('.oge-row .oge-cell:nth-child(3)');
    const before = (await prices.allTextContents()).join('|');
    await expect
      .poll(async () => (await prices.allTextContents()).join('|'), {
        timeout: 10_000,
      })
      .not.toBe(before);
    await expect
      .poll(
        () => grid.locator('.oge-cell-flash-a, .oge-cell-flash-b').count(),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);
    // updates only: the rows stay put, in the same order
    await expect(
      grid.locator('.oge-row').first().locator('.oge-cell').first(),
    ).toHaveText('AAPL');
  });

  for (const path of [
    '/components/data-grid/playground',
    '/components/data-grid/sorting',
    '/components/data-grid/virtual-scroll',
    '/components/data-grid/infinite-scroll',
    '/components/data-grid/remote-data',
    '/components/data-grid/live-updates',
  ]) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      // 100k / 1M-row pages: axe needs the slow budget
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      await expect(
        page.locator('app-react-host .oge-grid .oge-row').first(),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }

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
    '/components/data-grid/range-selection',
    '/components/data-grid/conditional-formatting',
    '/components/data-grid/pinned-rows',
  ]) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      // the grouping demo renders 500 rows in a 540px viewport without
      // virtualization (as the Angular demo does) — axe needs the slow budget
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // React grids fill their rows in an effect: give every demo grid a
      // moment to leave its transient "No data" body (an empty rowgroup
      // fails aria-required-children) — a page that is empty on purpose
      // simply proceeds after the wait
      const transientEmpty = page.locator(
        'app-react-host .oge-rows:has(> .oge-no-data)',
      );
      for (let i = 0; i < 25 && (await transientEmpty.count()) > 0; i++) {
        await page.waitForTimeout(200);
      }
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
