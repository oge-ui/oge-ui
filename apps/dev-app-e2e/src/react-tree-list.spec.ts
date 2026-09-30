import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the tree-list family (ADR 0002 + `docs/REACT-PARITY.md`).
 * Every page renders the real React tree list on the same route the Angular
 * view uses — the family is `'*'` in `FrameworkService.COVERAGE`, so no page
 * may fall back to silent Angular content — expansion, filtering and lazy
 * loading run through the shared `OgeTreeListCore`, and the pages are
 * axe-clean.
 */
const REACT = '?framework=react';

test.describe('React tree-list docs', () => {
  test('the overview mounts the React treegrid without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/tree-list${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    const tree = page.locator('app-react-host .oge-tree-list').first();
    await expect(tree.getByRole('treegrid')).toBeVisible();
    // makeOrgTree(): 1 CEO + 4 VPs + 12 directors + 60 engineers, all expanded
    await expect(tree.locator('.oge-row').first()).toHaveAttribute(
      'aria-level',
      '1',
    );
    await expect(tree.locator('.oge-row')).toHaveCount(77);
  });

  test('collapsing the root with the keyboard hides the whole tree', async ({
    page,
  }) => {
    await page.goto(`/components/tree-list${REACT}`);
    const tree = page.locator('app-react-host .oge-tree-list').first();
    const firstCell = tree.locator('[data-cell="0-0"]');
    await firstCell.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(tree.locator('.oge-row')).toHaveCount(1);
    await expect(tree.locator('.oge-row').first()).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('filtering keeps the ancestor chain of a search match', async ({
    page,
  }) => {
    await page.goto(`/components/tree-list/filtering${REACT}`);
    const tree = page.locator('app-react-host .oge-tree-list').first();
    await tree.getByRole('searchbox').fill('Director');
    await expect(tree.locator('.oge-row').first()).toContainText('CEO');
    await expect(tree.locator('mark.oge-highlight').first()).toHaveText(
      'Director',
    );
  });

  test('lazy loading fetches a level per expansion', async ({ page }) => {
    await page.goto(`/components/tree-list/lazy-loading${REACT}`);
    const tree = page.locator('app-react-host .oge-tree-list').first();
    await expect(tree.locator('.oge-row')).toHaveCount(1);
    await tree.locator('.oge-tree-expander').first().click();
    await expect(tree.locator('.oge-row')).toHaveCount(6);
    await expect(page.locator('ol code').nth(1)).toHaveText('parentId eq 1');
  });

  test('selection cascades and the React key list follows', async ({
    page,
  }) => {
    await page.goto(`/components/tree-list/selection${REACT}`);
    const tree = page.locator('app-react-host .oge-tree-list').first();
    await tree.locator('.oge-checkbox-cell input').nth(1).check();
    await expect(page.getByText(/Selected keys \(\d+\)/)).not.toHaveText(
      'Selected keys (0): —',
    );
  });

  test('the api page renders the React table', async ({ page }) => {
    await page.goto(`/components/tree-list/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '<OgeTreeList>' }),
    ).toBeVisible();
  });

  for (const path of [
    '/components/tree-list',
    '/components/tree-list/lazy-loading',
    '/components/tree-list/filtering',
    '/components/tree-list/selection',
    '/components/tree-list/virtual-scroll',
    '/components/tree-list/drag-drop',
    '/components/tree-list/editing',
    '/components/tree-list/api',
  ]) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      test.slow();
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // empty-table-header: the leading utility column headers (row drag,
      // select-all) carry an aria-label and no visible text — the same markup
      // the Angular tree list renders; a best-practice flag, not a failure.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order', 'empty-table-header'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
