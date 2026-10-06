import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The mention editor in both render layers: a caret-anchored suggestion
 * list on the shared anchored popup, the APG combobox keys, the inserted
 * plain-text token and the reported mentions, Escape, several triggers,
 * remote suggestions and axe with the list open. The React view is the same
 * route with `?framework=react`.
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
  test.describe(`${layer.name}: mention`, () => {
    const route = `/components/inputs/mention${layer.query}`;

    test('arrows pick a suggestion, Enter inserts it as text', async ({
      page,
    }) => {
      await page.goto(route);
      const field = page
        .locator(card('getting-started'))
        .locator('textarea.oge-input-native');
      await field.click();
      await page.keyboard.type('Thanks @a');
      const list = page.getByRole('listbox', { name: 'Suggestions' });
      await expect(list).toBeVisible();
      // contains-search: every demo name holds an "a"
      await expect(list.getByRole('option')).toHaveCount(4);
      const first = list.getByRole('option').first();
      await expect(field).toHaveAttribute(
        'aria-activedescendant',
        (await first.getAttribute('id'))!,
      );
      await page.keyboard.press('ArrowDown');
      await expect(list.getByRole('option').nth(1)).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('Enter');
      await expect(list).toBeHidden();
      await expect(field).toHaveValue('Thanks @Alan Turing ');
      await expect(page.getByTestId('mention-ids')).toHaveText('2');
      await expect(field).toBeFocused();

      // editing the token away drops the mention
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(page.getByTestId('mention-ids')).toHaveText('—');
    });

    test('a click inserts; Escape closes until the next trigger', async ({
      page,
    }) => {
      await page.goto(route);
      const field = page
        .locator(card('getting-started'))
        .locator('textarea.oge-input-native');
      await field.click();
      await page.keyboard.type('@gr');
      const list = page.getByRole('listbox', { name: 'Suggestions' });
      await expect(list.getByRole('option')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(list).toBeHidden();
      await page.keyboard.type('a');
      await expect(list).toBeHidden();
      await page.keyboard.type(' @');
      await expect(list).toBeVisible();
      await list.getByRole('option', { name: 'Ada Lovelace' }).click();
      await expect(field).toHaveValue('@gra @Ada Lovelace ');
      await expect(page.getByTestId('mention-ids')).toHaveText('1');
    });

    test('a trigger inside a word opens nothing', async ({ page }) => {
      await page.goto(route);
      const field = page
        .locator(card('getting-started'))
        .locator('textarea.oge-input-native');
      await field.click();
      await page.keyboard.type('mail@ad');
      await expect(page.getByRole('listbox')).toHaveCount(0);
    });

    test('several triggers on a single-line combobox', async ({ page }) => {
      await page.goto(route);
      const field = page
        .locator(card('several-triggers'))
        .getByRole('combobox');
      await expect(field).toHaveAttribute('aria-expanded', 'false');
      await field.click();
      await page.keyboard.type('fix #ur');
      await expect(field).toHaveAttribute('aria-expanded', 'true');
      const list = page.getByRole('listbox', { name: 'Suggestions' });
      await expect(list.getByRole('option')).toHaveText([/urgent/]);
      await page.keyboard.press('Tab');
      await expect(field).toHaveValue('fix #urgent ');
      await expect(field).toHaveAttribute('aria-expanded', 'false');
    });

    test('remote suggestions load after the debounce', async ({ page }) => {
      await page.goto(route);
      const field = page
        .locator(card('remote-suggestions'))
        .locator('textarea.oge-input-native');
      await field.click();
      await page.keyboard.type('@hop');
      const list = page.getByRole('listbox', { name: 'Suggestions' });
      await expect(list.getByRole('option')).toHaveText(['@Grace Hopper']);
      await page.keyboard.press('Enter');
      await expect(field).toHaveValue('@Grace Hopper ');
    });

    test('axe: no violations with the list open', async ({ page }) => {
      await page.goto(route);
      const field = page
        .locator(card('custom-suggestion-rows'))
        .locator('textarea.oge-input-native');
      await field.click();
      await page.keyboard.type('@');
      await expect(
        page.getByRole('listbox', { name: 'Suggestions' }),
      ).toBeVisible();
      await axe(page);
    });
  });
}
