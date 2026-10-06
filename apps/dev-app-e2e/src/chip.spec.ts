import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Chip and chip list — the APG contracts in a real DOM, in both render
 * layers: the listbox (roving tab stop, Space toggles, Home/End, Delete
 * removes and focus moves on), the layout grid (arrows reach the real remove
 * button) and a clean axe run over the page.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const focusedText = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');

for (const fw of FRAMEWORKS) {
  test.describe(`chip (${fw.name})`, () => {
    test('selectable chip toggles aria-pressed', async ({ page }) => {
      await page.goto(`/components/chip${fw.query}`);
      const demo = card(page, 'selectable-chips');
      const remote = demo.getByRole('button', { name: 'Remote', exact: true });
      await remote.scrollIntoViewIfNeeded();
      await expect(remote).toHaveAttribute('aria-pressed', 'true');
      await remote.click();
      await expect(remote).toHaveAttribute('aria-pressed', 'false');
      await expect(demo.getByTestId('chip-selected')).toContainText(
        'remote: false',
      );
    });

    test('removable chip has a named remove button', async ({ page }) => {
      await page.goto(`/components/chip${fw.query}`);
      const demo = card(page, 'removable-chips');
      const remove = demo.getByRole('button', {
        name: 'Remove Research',
        exact: true,
      });
      await remove.scrollIntoViewIfNeeded();
      await remove.click();
      await expect(remove).toHaveCount(0);
      await expect(
        demo.getByRole('button', { name: 'Remove Design', exact: true }),
      ).toBeVisible();
    });

    test('listbox: one tab stop, arrows skip disabled, Space toggles', async ({
      page,
    }) => {
      await page.goto(`/components/chip${fw.query}`);
      const demo = card(page, 'chip-list-single-selection');
      const listbox = demo.getByRole('listbox', { name: 'Size' });
      await listbox.scrollIntoViewIfNeeded();
      const options = listbox.getByRole('option');
      await expect(options).toHaveCount(4);
      // the selected chip owns the tab stop on first paint
      await expect(options.nth(1)).toHaveAttribute('tabindex', '0');
      await expect(options.nth(0)).toHaveAttribute('tabindex', '-1');
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');

      await options.nth(1).focus();
      await page.keyboard.press('ArrowRight');
      await expect(options.nth(2)).toBeFocused();
      // X-Large is disabled: End stops on Large
      await page.keyboard.press('End');
      await expect(options.nth(2)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(options.nth(0)).toBeFocused();
      await page.keyboard.press('Space');
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'false');
    });

    test('multiple selection is aria-multiselectable and reports', async ({
      page,
    }) => {
      await page.goto(`/components/chip${fw.query}`);
      const demo = card(page, 'chip-list-multiple-selection-filters');
      const listbox = demo.getByRole('listbox', { name: 'Filters' });
      await listbox.scrollIntoViewIfNeeded();
      await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
      await listbox.getByRole('option', { name: 'Bug', exact: true }).click();
      await expect(demo.getByTestId('chip-filters')).toContainText(
        'active: open, bug',
      );
    });

    test('grid: arrows reach the remove button, Delete removes and moves focus', async ({
      page,
    }) => {
      await page.goto(`/components/chip${fw.query}`);
      const demo = card(page, 'removable-list-apg-grid');
      const grid = demo.getByRole('grid', { name: 'Recipients' });
      await grid.scrollIntoViewIfNeeded();
      await expect(grid.getByRole('row')).toHaveCount(4);
      const firstCell = grid.getByRole('gridcell').first();
      await expect(firstCell).toHaveAttribute('tabindex', '0');
      await firstCell.focus();
      await page.keyboard.press('ArrowRight');
      await expect(
        grid.getByRole('button', { name: 'Remove Ada Lovelace', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focusedText(page)).toContain('Grace Hopper');
      await page.keyboard.press('Delete');
      await expect(grid.getByRole('row')).toHaveCount(3);
      await expect.poll(() => focusedText(page)).toContain('Alan Turing');
      await page.keyboard.press('Backspace');
      await expect(grid.getByRole('row')).toHaveCount(2);
      await expect.poll(() => focusedText(page)).toContain('Ada Lovelace');
    });

    test('chip page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/chip${fw.query}`);
      await expect(page.getByRole('listbox', { name: 'Size' })).toBeVisible();
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
