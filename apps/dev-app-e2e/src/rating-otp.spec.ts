import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The rating and the one-time-code input (W8b), in both render layers.
 * jsdom cannot measure the items a pointer lands on, deliver a real
 * clipboard paste or prove the focus ring and axe cleanliness — this suite
 * does, on the real pages. Every test runs once per layer: the React view is
 * the same route with `?framework=react`, and both layers render the same
 * `.oge-*` markup.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (id: string) => `app-demo-card:has(#${id})`;

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('app-demo-card')
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: rating`, () => {
    const route = `/components/inputs/rating${layer.query}`;

    test('APG slider keys step, clear and mirror in RTL', async ({ page }) => {
      await page.goto(route);
      const value = page.getByTestId('rating-value');
      await expect(value).toHaveText('3');
      const slider = page
        .locator(card('getting-started'))
        .getByRole('slider', { name: 'Your rating', exact: true });
      await slider.focus();
      await expect(slider).toHaveAttribute('aria-valuetext', '3 of 5');
      await page.keyboard.press('ArrowRight');
      await expect(value).toHaveText('4');
      await page.keyboard.press('End');
      await expect(value).toHaveText('5');
      await page.keyboard.press('2');
      await expect(value).toHaveText('2');
      await page.keyboard.press('Delete');
      await expect(value).toHaveText('null');
      await expect(slider).toHaveAttribute('aria-valuetext', 'Not rated');

      await slider.evaluate((el) =>
        el.closest('.oge-rating')?.setAttribute('dir', 'rtl'),
      );
      await page.keyboard.press('ArrowLeft');
      await expect(value).toHaveText('1');
    });

    test('a click commits, a re-click clears, half values follow the pointer', async ({
      page,
    }) => {
      await page.goto(route);
      const basic = page.locator(card('getting-started'));
      const items = basic.locator('.oge-rating-item');
      await items.nth(4).click();
      await expect(page.getByTestId('rating-value')).toHaveText('5');
      await items.nth(4).click();
      await expect(page.getByTestId('rating-value')).toHaveText('null');

      const halfCard = page.locator(card('half-and-fractional-values'));
      const half = halfCard.locator('.oge-rating').first();
      const second = half.locator('.oge-rating-item').nth(1);
      const box = (await second.boundingBox())!;
      // hover previews, the first half of an item picks the half
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
      await expect(half).toHaveClass(/oge-rating-hovering/);
      await page.mouse.down();
      await page.mouse.up();
      await expect(page.getByTestId('rating-half')).toHaveText('1.5');
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      await expect(page.getByTestId('rating-half')).toHaveText('2');
    });

    test('the radio-group variant roves and selects with arrows', async ({
      page,
    }) => {
      await page.goto(route);
      const group = page
        .locator(card('radio-group-semantics'))
        .getByRole('radiogroup', { name: 'Service', exact: true });
      const radios = group.getByRole('radio');
      await expect(radios).toHaveCount(5);
      await expect(radios.nth(3)).toHaveAttribute('aria-checked', 'true');
      await expect(radios.nth(3)).toHaveAttribute('tabindex', '0');
      await radios.nth(3).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('rating-radio-value')).toHaveText('5');
      await expect(radios.nth(4)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('rating-radio-value')).toHaveText('1');
      await expect(radios.nth(0)).toBeFocused();
    });

    test('keyboard focus shows the ring and the page is axe-clean', async ({
      page,
    }) => {
      await page.goto(route);
      const slider = page
        .locator(card('getting-started'))
        .getByRole('slider', { name: 'Your rating', exact: true });
      await slider.focus();
      await page.keyboard.press('ArrowLeft');
      await expect
        .poll(() => slider.evaluate((el) => getComputedStyle(el).boxShadow))
        .not.toBe('none');
      await axe(page);
    });
  });

  test.describe(`${layer.name}: OTP input`, () => {
    const route = `/components/inputs/otp-input${layer.query}`;

    test('typing advances, Backspace steps back, completed fires', async ({
      page,
    }) => {
      await page.goto(route);
      const basic = page.locator(card('getting-started'));
      const group = basic.getByRole('group', {
        name: 'Verification code',
        exact: true,
      });
      const cells = group.locator('.oge-otp-input-cell');
      await expect(cells).toHaveCount(6);
      await expect(cells.first()).toHaveAttribute(
        'autocomplete',
        'one-time-code',
      );
      await cells.first().focus();
      await page.keyboard.type('12a3');
      await expect(page.getByTestId('otp-value')).toHaveText('123');
      await expect(cells.nth(3)).toBeFocused();
      await page.keyboard.press('Backspace');
      await expect(page.getByTestId('otp-value')).toHaveText('12');
      await expect(cells.nth(2)).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(cells.nth(1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(cells.nth(2)).toBeFocused();
      await page.keyboard.type('3456');
      await expect(page.getByTestId('otp-value')).toHaveText('123456');
      await expect(page.getByTestId('otp-status')).toHaveText(
        'Verifying 123456',
      );
    });

    test('a paste fills every cell; one Tab stop for the group', async ({
      page,
    }) => {
      await page.goto(route);
      const cells = page
        .locator(card('getting-started'))
        .locator('.oge-otp-input-cell');
      await cells.first().focus();
      await cells.first().evaluate((el) => {
        const data = new DataTransfer();
        data.setData('text/plain', '98 76 54');
        el.dispatchEvent(
          new ClipboardEvent('paste', {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(page.getByTestId('otp-value')).toHaveText('987654');
      await expect(cells.nth(5)).toHaveValue('4');
      await expect(
        page.locator(
          `${card('getting-started')} .oge-otp-input-cell[tabindex="0"]`,
        ),
      ).toHaveCount(1);
    });

    test('alphanumeric cells upper-case and reject symbols', async ({
      page,
    }) => {
      await page.goto(route);
      const cells = page
        .locator(card('character-types-and-groups'))
        .locator('.oge-otp-input-cell');
      await expect(cells).toHaveCount(8);
      await cells.first().focus();
      await page.keyboard.type('ab-12');
      await expect(page.getByTestId('otp-key')).toHaveText('AB12');
      await expect(
        page
          .locator(card('character-types-and-groups'))
          .locator('.oge-otp-input-separator'),
      ).toHaveCount(1);
    });

    test('the page is axe-clean', async ({ page }) => {
      await page.goto(route);
      await page
        .locator(card('getting-started'))
        .locator('.oge-otp-input-cell')
        .first()
        .focus();
      await page.keyboard.type('12');
      await axe(page);
    });
  });
}
