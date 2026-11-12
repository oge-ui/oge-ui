import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Command palette — in both render layers: the hotkey and the button open a
 * modal combobox, fuzzy matching with highlights, the listbox keys, running a
 * command, focus restore, recent commands, keepOpen and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const dialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Command palette' });

for (const fw of FRAMEWORKS) {
  test.describe(`command palette (${fw.name})`, () => {
    test('opens from the hotkey, filters fuzzily and runs with the keyboard', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/command-palette${fw.query}`);
      const demo = card(page, 'basics');
      const open = demo.getByTestId('open-palette');
      await open.scrollIntoViewIfNeeded();
      await open.focus();
      await page.keyboard.press('ControlOrMeta+/');
      const box = dialog(page).getByRole('combobox');
      await expect(box).toBeFocused();
      await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
      const list = dialog(page).getByRole('listbox');
      await expect(list.getByRole('option')).toHaveCount(7);
      await expect(list.getByRole('group', { name: 'Navigate' })).toBeVisible();

      await box.fill('gtst');
      await expect(list.getByRole('option')).toHaveText([/Go to settings/]);
      await expect(list.locator('mark')).toHaveText(['G', 't', 's', 't']);
      await expect(dialog(page).getByRole('status')).toHaveText('1 result');

      await box.fill('prefs');
      // found through its keywords
      await expect(list.getByRole('option').first()).toContainText(
        'Go to settings',
      );
      await box.fill('');
      await expect(list.getByRole('option')).toHaveCount(7);
      const first = list.getByRole('option').first();
      await expect(first).toHaveAttribute('aria-selected', 'true');
      await expect(box).toHaveAttribute(
        'aria-activedescendant',
        (await first.getAttribute('id'))!,
      );
      await page.keyboard.press('ArrowDown');
      await expect(list.getByRole('option').nth(1)).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp'); // wraps past the disabled last one
      await expect(list.getByRole('option').nth(5)).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('Enter');
      await expect(dialog(page)).toHaveCount(0);
      await expect(demo.getByTestId('palette-last')).toHaveText(
        'Ran "Toggle dark theme"',
      );
      await expect(open).toBeFocused();
    });

    test('opens from a button, closes on Escape and on a backdrop press', async ({
      page,
      browserName,
    }) => {
      await page.goto(`/components/overlay/command-palette${fw.query}`);
      const demo = card(page, 'basics');
      await demo.getByTestId('open-palette').click();
      await expect(dialog(page).getByRole('combobox')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toHaveCount(0);
      // WebKit never focuses a clicked button, so there is no focus to restore
      if (browserName !== 'webkit') {
        await expect(demo.getByTestId('open-palette')).toBeFocused();
      }
      await demo.getByTestId('open-palette').click();
      await expect(dialog(page)).toBeVisible();
      await page.mouse.click(8, 8);
      await expect(dialog(page)).toHaveCount(0);
      await demo.getByTestId('open-palette').click();
      await dialog(page)
        .getByRole('option', { name: /Go to reports/ })
        .click();
      await expect(demo.getByTestId('palette-last')).toHaveText(
        'Ran "Go to reports"',
      );
    });

    test('keeps open on request and lists recent commands first', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/command-palette${fw.query}`);
      const demo = card(page, 'recent-commands-keepopen');
      const count = demo.getByTestId('palette-count');
      await demo.getByTestId('open-counter').click();
      const box = dialog(page).getByRole('combobox');
      await expect(box).toHaveAttribute(
        'placeholder',
        'Search counter commands…',
      );
      await page.keyboard.press('Enter'); // Increment, keeps open
      await page.keyboard.press('Enter');
      await expect(count).toHaveText('Count: 2 · recent: increment');
      await box.fill('reset');
      await page.keyboard.press('Enter');
      await expect(dialog(page)).toHaveCount(0);
      await expect(count).toHaveText('Count: 0 · recent: reset, increment');
      await demo.getByTestId('open-counter').click();
      const recent = dialog(page).getByRole('group', { name: 'Recent' });
      await expect(recent.getByRole('option')).toHaveText([
        /Reset the counter/,
        /Increment/,
      ]);
    });

    test('command palette page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/overlay/command-palette${fw.query}`);
      await card(page, 'basics').getByTestId('open-palette').click();
      await expect(dialog(page)).toBeVisible();
      await dialog(page).getByRole('combobox').fill('go');
      const results = await new AxeBuilder({ page })
        .include('.oge-command-palette')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
      await page.keyboard.press('Escape');
      const page2 = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(page2.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
