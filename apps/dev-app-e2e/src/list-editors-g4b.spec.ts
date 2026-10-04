import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * G4b in both render layers: remote paging + templates + cancelable closing
 * on the select box, the tag box's select-all / caps / remote data, tree
 * select chips and the forms server-error / conditional-field demo.
 */
const VIEWS = [
  { name: 'Angular', query: '', scope: 'body' },
  { name: 'React', query: '?framework=react', scope: 'app-react-host' },
] as const;

for (const view of VIEWS) {
  test.describe(`G4b list editors (${view.name})`, () => {
    test('select box remote data resolves byKey and pages on scroll', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/select-box${view.query}`);
      const demo = page.locator(`${view.scope} [data-demo="remote"]`).first();
      const input = demo.locator('input[role="combobox"]');
      await expect(input).toHaveValue('Customer 1234');
      await input.click();
      const list = page.locator('.oge-select-list');
      await expect(list.locator('.oge-select-option').first()).toContainText(
        'Customer 0001',
      );
      await expect(list.locator('.oge-select-option').first()).toHaveAttribute(
        'aria-setsize',
        '5000',
      );
      // scroll to the loaded end until the next page has landed
      const highest = async () =>
        Math.max(
          ...(await list.locator('.oge-select-option').allTextContents()).map(
            (text) => Number(text.replace(/\D/g, '')),
          ),
        );
      await expect(async () => {
        await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
        expect(await highest()).toBeGreaterThan(40);
      }).toPass({ timeout: 15000 });
      await input.fill('4999');
      await expect(list.locator('.oge-select-option')).toHaveText([
        'Customer 4999',
      ]);
    });

    test('select box templates render and closing can be vetoed', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/select-box${view.query}`);
      const demo = page
        .locator(`${view.scope} [data-demo="templates"]`)
        .first();
      await expect(demo.locator('.oge-select-field-content')).toContainText(
        'In progress',
      );
      const input = demo.locator('input[role="combobox"]');
      await input.click();
      await expect(page.locator('.oge-select-group').first()).toContainText(
        'Phase · Open',
      );
      await expect(page.locator('.oge-select-popup-header')).toContainText(
        '4 statuses',
      );
      await page.locator('.oge-select-popup-footer input').check();
      await input.press('Escape');
      await expect(page.locator('.oge-select-list')).toBeVisible();
      await page.locator('.oge-select-option', { hasText: 'Done' }).click();
      await expect(page.locator('.oge-select-list')).toBeHidden();
      await expect(demo.locator('.oge-select-field-content')).toContainText(
        'Done',
      );
    });

    test('tag box select all, cap and custom tags', async ({ page }) => {
      await page.goto(`/components/inputs/select-box${view.query}`);
      const demo = page
        .locator(`${view.scope} [data-demo="tag-features"]`)
        .first();
      const input = demo.locator('input[role="combobox"]');
      await input.click();
      const selectAll = page.locator('.oge-tag-select-all-option');
      await expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
      await selectAll.click();
      // capped at five of six
      await expect(page.locator('.oge-select-limit')).toContainText('up to 5');
      await expect(demo.locator('.oge-tag-more')).toHaveText('+2 more');
      const results = await new AxeBuilder({ page })
        .include('.oge-tag-box')
        .include('.oge-popup')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
      // at the cap the row reads mixed and clicking it clears the visible items
      await expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
      await selectAll.click();
      await expect(demo.locator('.oge-tag')).toHaveCount(0);
      await input.fill('Rust');
      await input.press('Enter');
      await expect(
        demo.locator('.oge-tag-text', { hasText: '#Rust' }),
      ).toBeVisible();
    });

    test('tree select shows its selection as removable chips', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/tree-select${view.query}`);
      const field = page
        .locator(`${view.scope} .oge-tree-select-chips`)
        .first();
      await expect(field.locator('.oge-tag-text')).toHaveText([
        'Reports',
        'Contracts',
        'Holiday',
      ]);
      await field.getByRole('button', { name: 'Remove Contracts' }).click();
      await expect(field.locator('.oge-tag-text')).toHaveText([
        'Reports',
        'Holiday',
      ]);
    });

    test('forms: conditional field, compare rule and server errors', async ({
      page,
    }) => {
      await page.goto(`/components/forms/validation${view.query}`);
      const form = page
        .locator(`${view.scope} .oge-form`, { hasText: 'Account type' })
        .first();
      await expect(form.getByText('Company name')).toHaveCount(0);
      await form.getByRole('radio', { name: 'Company' }).click();
      await expect(form.getByText('Company name').first()).toBeVisible();
      await form.getByRole('radio', { name: 'Person' }).click();
      const box = (name: string) =>
        form.getByRole('textbox', { name, exact: true });
      await box('Password').fill('secret');
      await box('Confirm password').fill('nope');
      await box('Confirm password').blur();
      await expect(
        form.getByText('The values do not match').first(),
      ).toBeVisible();
      await box('Confirm password').fill('secret');
      await form.getByRole('button', { name: 'Register' }).click();
      await expect(
        form.getByText('This email is already registered').first(),
      ).toBeVisible();
      await box('Email').fill('fresh@example.com');
      await expect(
        form.getByText('This email is already registered'),
      ).toHaveCount(0);
    });
  });
}
