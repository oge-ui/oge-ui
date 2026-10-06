import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The signature pad in both render layers: real pointer strokes (jsdom has no
 * canvas and no layout), undo / clear / Escape-cancel, the typed-signature
 * keyboard alternative and axe. Every test runs once per layer — the React
 * view is the same route with `?framework=react`.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (id: string) => `app-demo-card:has(#${id})`;

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.oge-signature-pad')
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function stroke(
  page: Page,
  surface: Locator,
  from: [number, number],
  to: [number, number],
): Promise<void> {
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  await page.mouse.move(
    box.x + box.width * from[0],
    box.y + box.height * from[1],
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], {
    steps: 6,
  });
  await page.mouse.up();
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: signature pad`, () => {
    const route = `/components/inputs/signature-pad${layer.query}`;

    test('strokes commit, undo and clear', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('getting-started'));
      const surface = demo.locator('.oge-signature-pad-surface');
      await expect(surface).toHaveAttribute(
        'aria-label',
        'Customer signature, not signed',
      );
      await expect(surface).toHaveCSS('touch-action', 'none');
      await stroke(page, surface, [0.1, 0.5], [0.6, 0.3]);
      await expect(page.getByTestId('signature-signed')).toHaveText('true');
      await expect(page.getByTestId('signature-strokes')).toHaveText('1');
      await expect(surface).toHaveAttribute(
        'aria-label',
        'Customer signature, signed',
      );
      await stroke(page, surface, [0.2, 0.7], [0.8, 0.6]);
      await expect(page.getByTestId('signature-strokes')).toHaveText('2');

      const undo = demo.getByRole('button', { name: 'Undo last stroke' });
      await undo.click();
      await expect(page.getByTestId('signature-signed')).toHaveText('true');
      await undo.click();
      await expect(page.getByTestId('signature-signed')).toHaveText('false');
      await expect(undo).toBeDisabled();

      await stroke(page, surface, [0.1, 0.5], [0.6, 0.3]);
      await demo.getByRole('button', { name: 'Clear signature' }).click();
      await expect(page.getByTestId('signature-signed')).toHaveText('false');
    });

    test('Escape mid-stroke cancels it; Ctrl+Z undoes', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('getting-started'));
      const surface = demo.locator('.oge-signature-pad-surface');
      await stroke(page, surface, [0.1, 0.5], [0.5, 0.4]);
      await expect(page.getByTestId('signature-strokes')).toHaveText('1');

      const box = (await surface.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, {
        steps: 4,
      });
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(page.getByTestId('signature-strokes')).toHaveText('1');

      await demo.getByRole('button', { name: 'Clear signature' }).focus();
      await page.keyboard.press('Control+z');
      await expect(page.getByTestId('signature-signed')).toHaveText('false');
    });

    test('the typed signature is a keyboard-only path', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('typed-signature'));
      await expect(page.getByTestId('signature-mode')).toHaveText('type');
      const input = demo.getByLabel('Type your full name');
      await input.focus();
      await page.keyboard.type('Ada Lovelace');
      await expect(page.getByTestId('signature-typed-signed')).toHaveText(
        'true',
      );
      await expect(demo.locator('.oge-signature-pad-typed')).toHaveText(
        'Ada Lovelace',
      );
      // Draw / Type is a pressed-state pair reachable by Tab
      const draw = demo.getByRole('button', { name: 'Draw', exact: true });
      await draw.focus();
      await page.keyboard.press('Enter');
      await expect(draw).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('signature-mode')).toHaveText('draw');
      await expect(page.getByTestId('signature-typed-signed')).toHaveText(
        'false',
      );
      await demo.getByRole('button', { name: 'Type', exact: true }).click();
      await expect(input).toBeFocused();
      await expect(page.getByTestId('signature-typed-signed')).toHaveText(
        'true',
      );
    });

    test('an SVG value round-trips into an editable pad', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('svg-and-pen-options'));
      const surface = demo.locator('.oge-signature-pad-surface');
      await stroke(page, surface, [0.1, 0.5], [0.7, 0.4]);
      await page.getByTestId('signature-save').getByRole('button').click();
      await demo.getByRole('button', { name: 'Clear signature' }).click();
      const undo = demo.getByRole('button', { name: 'Undo last stroke' });
      await expect(undo).toBeDisabled();
      await page.getByTestId('signature-restore').getByRole('button').click();
      await expect(undo).toBeEnabled();
    });

    test('axe: no violations, empty and signed', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-signature-pad').first()).toBeVisible();
      await axe(page);
      const surface = page
        .locator(card('getting-started'))
        .locator('.oge-signature-pad-surface');
      await stroke(page, surface, [0.1, 0.5], [0.6, 0.3]);
      await expect(page.getByTestId('signature-signed')).toHaveText('true');
      await axe(page);
    });
  });
}
