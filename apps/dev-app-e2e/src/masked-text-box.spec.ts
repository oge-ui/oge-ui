import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * jsdom has no real `beforeinput` from key presses, no real caret and no real
 * clipboard — this suite types, deletes and pastes into the masked editors in
 * a real browser, in both render layers, and runs axe over the page.
 */

const LAYERS = [
  ['Angular', ''],
  ['React', '?framework=react'],
] as const;

const ROUTE = '/components/inputs/masked-text-box';
const card = (id: string) => `app-demo-card:has(#${id})`;

async function open(page: Page, query: string): Promise<void> {
  await page.goto(`${ROUTE}${query}`);
  if (query) {
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
  }
}

for (const [layer, query] of LAYERS) {
  test.describe(`masked text box — ${layer}`, () => {
    test('typing skips literals and commits the raw value', async ({
      page,
    }) => {
      await open(page, query);
      const input = page.locator(`${card('getting-started')} input`).first();
      await input.scrollIntoViewIfNeeded();
      await expect(input).toHaveValue('(___) ___-____');
      await expect(input).toHaveAttribute('inputmode', 'numeric');
      await input.click();
      await page.keyboard.type('555123');
      await expect(input).toHaveValue('(555) 123-____');
      await expect(page.getByTestId('masked-phone-value')).toHaveText('555123');
      // letters are rejected outright
      await page.keyboard.type('ab');
      await expect(input).toHaveValue('(555) 123-____');
    });

    test('backspace crosses literals; the caret stays in the column', async ({
      page,
    }) => {
      await open(page, query);
      const input = page.locator(`${card('getting-started')} input`).first();
      await input.click();
      await page.keyboard.type('5551');
      await expect(input).toHaveValue('(555) 1__-____');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(input).toHaveValue('(55_) ___-____');
      await page.keyboard.type('9');
      await expect(input).toHaveValue('(559) ___-____');
    });

    test('paste accepts formatted text and completion fires', async ({
      page,
    }) => {
      await open(page, query);
      const input = page
        .locator(`${card('raw-and-formatted-values')} input`)
        .nth(1);
      await input.scrollIntoViewIfNeeded();
      await input.click();
      // a synthetic paste: the cancelable beforeinput a real paste fires
      await input.evaluate((el) => {
        el.dispatchEvent(
          new InputEvent('beforeinput', {
            inputType: 'insertFromPaste',
            data: '4111 1111-1111.1111',
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(input).toHaveValue('4111 1111 1111 1111');
      await expect(page.getByTestId('masked-card-formatted')).toHaveText(
        '4111 1111 1111 1111',
      );
      await expect(page.getByTestId('masked-card-status')).toHaveText(
        'Complete: 4111 1111 1111 1111',
      );
    });

    test('custom rules and escaped literals', async ({ page }) => {
      await open(page, query);
      const syntax = card('mask-syntax-and-custom-rules');
      const hex = page.locator(`${syntax} input`).nth(1);
      await hex.scrollIntoViewIfNeeded();
      await hex.click();
      await page.keyboard.type('fzf0a1b');
      await expect(hex).toHaveValue('ff0a1b');
      const product = page.locator(`${syntax} input`).nth(3);
      await product.click();
      await page.keyboard.type('123xy');
      await expect(product).toHaveValue('A-123-xy');
    });

    test('an unfinished mask shows its message after blur', async ({
      page,
    }) => {
      await open(page, query);
      const forms = card('validation-and-forms');
      const tax = page.locator(`${forms} input`).nth(1);
      await tax.scrollIntoViewIfNeeded();
      await tax.click();
      await page.keyboard.type('123');
      await page.keyboard.press('Tab');
      await expect(
        page.locator(`${forms} .oge-input-error`, {
          hasText: 'Enter all 10 digits',
        }),
      ).toBeVisible();
    });

    test('showMaskMode onFocus reveals the mask on focus', async ({ page }) => {
      await open(page, query);
      const postal = page.locator(`${card('mask-display')} input`).nth(1);
      await postal.scrollIntoViewIfNeeded();
      await expect(postal).toHaveValue('');
      await postal.click();
      await expect(postal).toHaveValue('_____');
    });

    test('the page is axe-clean', async ({ page }) => {
      await open(page, query);
      await page.locator('.oge-masked-text-box').first().waitFor();
      const results = await new AxeBuilder({ page })
        .include('.oge-masked-text-box')
        .include('.oge-text-box')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
