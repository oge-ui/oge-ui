import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Data view — in both render layers: list semantics without selection, the
 * layout switch, the built-in pager's focus rule, search + sort, the
 * listbox keyboard (2-D arrows, Space, Ctrl+A), remote operations and a clean
 * axe run over the page.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const itemNames = (view: Locator) =>
  view
    .locator('.oge-data-view-item .demo-dv-name')
    .evaluateAll((nodes) => nodes.map((n) => n.textContent?.trim() ?? ''));

for (const fw of FRAMEWORKS) {
  test.describe(`data view (${fw.name})`, () => {
    test('renders a named list of list items without selection', async ({
      page,
    }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'basics-templates');
      const list = demo.getByRole('list', { name: 'Products', exact: true });
      await list.scrollIntoViewIfNeeded();
      await expect(list.getByRole('listitem')).toHaveCount(6);
      await expect(list.getByRole('listitem').first()).toContainText(
        'Oak desk',
      );
    });

    test('the layout switch is a pressed-state toggle group', async ({
      page,
    }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'grid-and-list-layouts');
      const group = demo.getByRole('group', { name: 'Layout', exact: true });
      await group.scrollIntoViewIfNeeded();
      const grid = group.getByRole('button', { name: 'Grid', exact: true });
      const list = group.getByRole('button', { name: 'List', exact: true });
      await expect(grid).toHaveAttribute('aria-pressed', 'true');
      await list.click();
      await expect(list).toHaveAttribute('aria-pressed', 'true');
      await expect(grid).toHaveAttribute('aria-pressed', 'false');
      await expect(demo.getByTestId('data-view-layout')).toHaveText(
        'Layout: list',
      );
      await expect(demo.locator('.oge-data-view')).toHaveClass(
        /oge-data-view-layout-list/,
      );
    });

    test('the pager keeps focus and moves it when a button disables', async ({
      page,
    }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'paging');
      const pager = demo.getByRole('group', { name: 'Pages', exact: true });
      await pager.scrollIntoViewIfNeeded();
      const next = pager.getByRole('button', {
        name: 'Next page',
        exact: true,
      });
      await expect(
        pager.getByRole('button', { name: 'Page 1', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await next.click();
      await expect(next).toBeFocused();
      await expect(demo.getByTestId('data-view-page')).toContainText('Page 2');
      await expect(demo.locator('.oge-data-view-info')).toHaveText('5–8 of 12');
      await page.keyboard.press('Enter');
      // the last page disables "next": focus lands on the current page button
      const third = pager.getByRole('button', { name: 'Page 3', exact: true });
      await expect(third).toHaveAttribute('aria-current', 'page');
      await expect(next).toBeDisabled();
      await expect(third).toBeFocused();
    });

    test('search folds text and the sort reorders', async ({ page }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'sorting-search-filtering');
      const view = demo.locator('.oge-data-view');
      const search = demo.getByRole('searchbox', {
        name: 'Search',
        exact: true,
      });
      await search.scrollIntoViewIfNeeded();
      await search.fill('LAMP');
      await expect
        .poll(() => itemNames(view))
        .toEqual(['Desk lamp', 'Floor lamp']);
      await demo
        .getByRole('combobox', { name: /Sort by/ })
        .selectOption('name');
      await demo
        .getByRole('button', { name: 'Descending', exact: true })
        .click();
      await expect
        .poll(() => itemNames(view))
        .toEqual(['Floor lamp', 'Desk lamp']);
      await search.fill('');
      await demo
        .getByRole('checkbox', { name: 'In stock only', exact: true })
        .click();
      await expect.poll(async () => (await itemNames(view)).length).toBe(9);
    });

    test('listbox: one tab stop, 2-D arrows, Space and Ctrl+A', async ({
      page,
    }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'selection');
      const listbox = demo.getByRole('listbox', {
        name: 'Pick products',
        exact: true,
      });
      await listbox.scrollIntoViewIfNeeded();
      await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
      const options = listbox.getByRole('option');
      await expect(options).toHaveCount(8);
      // the selected item owns the tab stop on first paint
      await expect(options.nth(1)).toHaveAttribute('tabindex', '0');
      await expect(options.nth(0)).toHaveAttribute('tabindex', '-1');
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');

      await options.nth(1).focus();
      await page.keyboard.press('ArrowRight');
      await expect(options.nth(2)).toBeFocused();
      await page.keyboard.press('Space');
      await expect(options.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(demo.getByTestId('data-view-selected')).toHaveText(
        'Selected: 2, 3',
      );

      // Down jumps one visual row: same column, next row
      await page.keyboard.press('Home');
      await expect(options.nth(0)).toBeFocused();
      const start = await options.nth(0).boundingBox();
      await page.keyboard.press('ArrowDown');
      await expect
        .poll(() =>
          page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            const rect = el?.getBoundingClientRect();
            return rect ? Math.round(rect.left) : -1;
          }),
        )
        .toBe(Math.round(start!.x));
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                document.activeElement as HTMLElement | null
              )?.getBoundingClientRect().top ?? 0,
          ),
        )
        .toBeGreaterThan(start!.y + 10);

      await page.keyboard.press('Control+a');
      await expect(listbox.locator('[aria-selected="true"]')).toHaveCount(8);
    });

    test('remote operations: the app answers the request', async ({ page }) => {
      await page.goto(`/components/data-view${fw.query}`);
      const demo = card(page, 'remote-operations');
      const view = demo.locator('.oge-data-view');
      const search = demo.getByRole('searchbox', {
        name: 'Search',
        exact: true,
      });
      await search.scrollIntoViewIfNeeded();
      await expect(demo.locator('.oge-data-view-info')).toHaveText('1–3 of 12');
      await search.fill('desk');
      // three matches fill exactly one page of three: the pager goes away
      await expect
        .poll(() => itemNames(view))
        .toEqual(['Oak desk', 'Desk lamp', 'Standing desk']);
      await expect(demo.locator('.oge-data-view-pager')).toHaveCount(0);
    });

    test('data view page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/data-view${fw.query}`);
      await expect(
        page.getByRole('listbox', { name: 'Pick products', exact: true }),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
