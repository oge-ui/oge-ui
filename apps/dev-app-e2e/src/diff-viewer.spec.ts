import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Diff viewer — in both render layers: counts, word highlights, folds that
 * open, the layout switch, change navigation (announced), JSON compared with
 * key order aside, and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

for (const fw of FRAMEWORKS) {
  test.describe(`diff viewer (${fw.name})`, () => {
    test('shows a side-by-side diff, folds, switches layout and steps through changes', async ({
      page,
    }) => {
      await page.goto(`/components/diff-viewer${fw.query}`);
      const demo = card(page, 'text');
      const viewer = demo.getByRole('group', { name: 'Comparison' });
      await viewer.scrollIntoViewIfNeeded();
      await expect(viewer.locator('.oge-diff-viewer-added-count')).toHaveText(
        '+4',
      );
      await expect(viewer.locator('.oge-diff-viewer-removed-count')).toHaveText(
        '−4',
      );
      await expect(viewer.locator('th')).toHaveText(['Before', 'After']);
      // "port: 8080" → "port: 8443": only the number is highlighted
      await expect(
        viewer.locator('td.oge-diff-viewer-delete mark').first(),
      ).toHaveText('8080');
      await expect(
        viewer.locator('td.oge-diff-viewer-insert mark').first(),
      ).toHaveText('8443');
      const fold = viewer.locator('.oge-diff-viewer-expand');
      await expect(fold.first()).toHaveText(/Show \d+ unchanged lines?/);
      const folds = await fold.count();
      await fold.first().click();
      await expect(fold).toHaveCount(folds - 1);

      await viewer.getByRole('button', { name: 'Next change' }).click();
      await expect(viewer.getByRole('status')).toHaveText(/^Change 1 of \d+$/);
      await expect(
        viewer.locator('tr.oge-diff-viewer-current').first(),
      ).toBeVisible();
      await viewer.getByRole('button', { name: 'Previous change' }).click();
      await expect(viewer.getByRole('status')).not.toHaveText(/^Change 1 of/);

      await viewer.getByRole('button', { name: 'Inline' }).click();
      await expect(
        viewer.getByRole('button', { name: 'Inline' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(viewer.locator('th')).toHaveCount(3);
      // the removed line comes first, then the added one
      const change = viewer.locator('tr[data-change="0"]');
      const markers = await change
        .locator('.oge-diff-viewer-marker')
        .allTextContents();
      expect(markers.length).toBeGreaterThanOrEqual(2);
      expect(markers.join('')).toMatch(/^−+\++$/);
    });

    test('compares JSON with key order aside and lists the changed paths', async ({
      page,
    }) => {
      await page.goto(`/components/diff-viewer${fw.query}`);
      const demo = card(page, 'json');
      await demo.scrollIntoViewIfNeeded();
      await expect(demo.getByTestId('diff-changes').locator('li')).toHaveText([
        'changed $.price',
        'changed $.stock.warehouse',
        'added $.tags[2]',
      ]);
      // "name" and "sku" swapped places: not a change
      await expect(demo.locator('td.oge-diff-viewer-insert')).not.toContainText(
        ['"sku"'],
      );
    });

    test('diff viewer page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/diff-viewer${fw.query}`);
      await expect(
        card(page, 'text').getByRole('group', { name: 'Comparison' }),
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
