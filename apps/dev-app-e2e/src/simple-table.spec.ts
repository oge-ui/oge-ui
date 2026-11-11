import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Simple table — in both render layers: a named native table with column
 * headers, header and cell alignment shared through one class, the pager
 * with its range text and disabled ends, and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

for (const fw of FRAMEWORKS) {
  test.describe(`simple table (${fw.name})`, () => {
    test('renders a named table with column headers', async ({ page }) => {
      await page.goto(`/components/simple-table${fw.query}`);
      const table = card(page, 'basics').getByRole('table', {
        name: 'Order lines',
        exact: true,
      });
      await table.scrollIntoViewIfNeeded();
      await expect(table.getByRole('columnheader')).toHaveText([
        'SKU',
        'Product',
        'Qty',
        'Unit price',
      ]);
      await expect(table.getByRole('row')).toHaveCount(5); // header + 4
      await expect(
        table.getByRole('cell', { name: 'Mesh office chair' }),
      ).toBeVisible();
    });

    test('a row template lines its cells up with their headers', async ({
      page,
    }) => {
      await page.goto(`/components/simple-table${fw.query}`);
      const table = card(page, 'row-templates').getByRole('table', {
        name: 'Order lines with status',
      });
      await table.scrollIntoViewIfNeeded();
      const header = table.getByRole('columnheader', { name: 'Unit price' });
      const cell = table.getByRole('row').nth(1).getByRole('cell').nth(3);
      await expect(cell).toHaveText('$840.00');
      const align = (l: Locator) =>
        l.evaluate((el) => getComputedStyle(el).textAlign);
      expect(await align(header)).toBe('end');
      expect(await align(cell)).toBe('end');
      await expect(table.locator('.demo-st-status')).toHaveCount(2);
    });

    test('pages with previous / next and a range text', async ({ page }) => {
      await page.goto(`/components/simple-table${fw.query}`);
      const demo = card(page, 'paging-footer-and-empty-state');
      const table = demo.getByRole('table', { name: 'Audit log' });
      await table.scrollIntoViewIfNeeded();
      const pager = demo.getByRole('group', { name: 'Table pages' });
      const previous = pager.getByRole('button', { name: 'Previous page' });
      const next = pager.getByRole('button', { name: 'Next page' });
      await expect(pager.locator('.oge-simple-table-info')).toHaveText(
        '1–5 of 12',
      );
      await expect(previous).toBeDisabled();
      await next.click();
      await expect(pager.locator('.oge-simple-table-info')).toHaveText(
        '6–10 of 12',
      );
      await expect(demo.getByTestId('simple-table-page')).toHaveText('Page 2');
      await next.click();
      await expect(next).toBeDisabled();
      await expect(table.locator('tbody tr')).toHaveCount(2);
      await expect(table.locator('tfoot')).toContainText('12 events');
    });

    test('simple table page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/simple-table${fw.query}`);
      await expect(
        page.getByRole('table', { name: 'Audit log' }),
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
