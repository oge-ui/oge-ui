import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The list box in both render layers: the APG listbox keyboard (selection
 * follows focus in single mode, Shift ranges and Ctrl+A in multiple mode),
 * type-ahead, search, real pointer clicks and axe. The React view is the
 * same route with `?framework=react`; both layers render the same
 * `.oge-list-box-*` markup.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (id: string) => `app-demo-card:has(#${id})`;

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: list box`, () => {
    const route = `/components/inputs/list-box${layer.query}`;

    test('single mode: arrows select, type-ahead jumps, disabled is skipped', async ({
      page,
    }) => {
      await page.goto(route);
      const value = page.getByTestId('list-box-value');
      await expect(value).toHaveText('3');
      const list = page
        .locator(card('getting-started'))
        .getByRole('listbox', { name: 'City', exact: true });
      await list.focus();
      await expect(list).toHaveAttribute('aria-activedescendant', /option-2$/);
      // Berlin → (Bonn is disabled) → Hamburg
      await page.keyboard.press('ArrowDown');
      await expect(value).toHaveText('5');
      await page.keyboard.press('Home');
      await expect(value).toHaveText('1');
      await page.keyboard.press('End');
      await expect(value).toHaveText('8');
      // accent-insensitive prefix: "i" finds İstanbul
      await page.keyboard.press('i');
      await expect(value).toHaveText('6');
      await expect(
        list.getByRole('option', { name: 'İstanbul', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
    });

    test('multiple mode: Space toggles, Shift extends, Ctrl+A selects all, clicks toggle', async ({
      page,
    }) => {
      await page.goto(route);
      const value = page.getByTestId('list-box-multi-value');
      await expect(value).toHaveText('[2,6]');
      const list = page
        .locator(card('multiple-selection'))
        .getByRole('listbox', { name: 'Cities to visit', exact: true });
      await expect(list).toHaveAttribute('aria-multiselectable', 'true');
      await list.focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('Space');
      await expect(value).toHaveText('[1,2,6]');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Shift+ArrowDown');
      await expect(value).toHaveText('[1,2,3,6]');
      await page.keyboard.press('ControlOrMeta+a');
      await expect(value).toHaveText('[1,2,3,5,6,7,8]');
      await list.getByRole('option', { name: 'Ankara', exact: true }).click();
      await expect(value).toHaveText('[1,3,5,6,7,8]');
    });

    test('search filters the grouped list', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('groups-and-search'));
      const list = demo.getByRole('listbox', { name: 'Office', exact: true });
      await expect(list.getByRole('group')).toHaveCount(3);
      await demo.getByRole('searchbox').fill('dam');
      await expect(list.getByRole('option')).toHaveText([
        'Amsterdam',
        'Rotterdam',
      ]);
      await page.keyboard.press('ArrowDown');
      await expect(list).toBeFocused();
    });

    test('is axe clean', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-list-box').first()).toBeVisible();
      await axe(page);
    });
  });
}
