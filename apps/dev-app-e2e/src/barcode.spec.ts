import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Barcode — in both render layers: QR / Code 128 / EAN-13 drawn as named SVG,
 * the message for a value that does not fit, the SVG download, the scanner's
 * status without a reader, reading an image through BarcodeDetector (a stub,
 * so every engine takes the same path) and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

/** A 1 × 1 PNG: enough for createImageBitmap; the stub detector reads it. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

for (const fw of FRAMEWORKS) {
  test.describe(`barcode (${fw.name})`, () => {
    test('draws QR, Code 128 and EAN-13 symbols and explains a value that does not fit', async ({
      page,
    }) => {
      await page.goto(`/components/barcode${fw.query}`);
      const demo = card(page, 'generate');
      await demo.scrollIntoViewIfNeeded();
      const symbol = demo.getByRole('img', {
        name: 'QR code: https://ogeui.com',
      });
      await expect(symbol).toBeVisible();
      // version 2 (25 modules) plus the quiet zone, 3 px a module
      await expect(symbol).toHaveAttribute('viewBox', '0 0 33 33');
      await expect(symbol).toHaveAttribute('width', '99');
      await demo.getByRole('button', { name: 'ean13' }).click();
      await expect(demo.locator('.oge-barcode-invalid')).toHaveText(
        'This value cannot be shown as a EAN-13 code',
      );
      await demo.getByTestId('barcode-value').fill('400638133393');
      await expect(demo.locator('.oge-barcode-text')).toHaveText(
        '4006381333931',
      );
      await demo.getByRole('button', { name: 'code128' }).click();
      await demo.getByTestId('barcode-value').fill('SHIP-1');
      await expect(
        demo.getByRole('img', { name: 'Barcode: SHIP-1' }),
      ).toBeVisible();
      const download = page.waitForEvent('download');
      await demo.getByRole('button', { name: 'Download SVG' }).click();
      expect((await download).suggestedFilename()).toBe('barcode.svg');
      await expect(
        card(page, 'labels').locator('svg.oge-barcode-symbol'),
      ).toHaveCount(3);
    });

    test('says when the browser cannot read barcodes', async ({ page }) => {
      await page.addInitScript(() => {
        delete (window as { BarcodeDetector?: unknown }).BarcodeDetector;
      });
      await page.goto(`/components/barcode${fw.query}`);
      const scanner = card(page, 'scan').getByRole('group', {
        name: 'Barcode scanner',
      });
      await scanner.scrollIntoViewIfNeeded();
      await scanner.getByRole('button', { name: 'Start camera' }).click();
      await expect(scanner.getByRole('status')).toHaveText(
        'This browser cannot read barcodes',
      );
      await expect(
        scanner.getByRole('button', { name: 'Start camera' }),
      ).toHaveAttribute('aria-pressed', 'false');
    });

    test('reads an image file through the browser reader', async ({ page }) => {
      await page.addInitScript(() => {
        (window as { BarcodeDetector?: unknown }).BarcodeDetector = class {
          async detect() {
            return [{ rawValue: '4006381333931', format: 'ean_13' }];
          }
        };
      });
      await page.goto(`/components/barcode${fw.query}`);
      const demo = card(page, 'scan');
      await demo.scrollIntoViewIfNeeded();
      await demo.locator('.oge-barcode-scanner-file').setInputFiles({
        name: 'label.png',
        mimeType: 'image/png',
        buffer: PNG,
      });
      await expect(demo.getByRole('status')).toHaveText('Read: 4006381333931');
      await expect(demo.getByTestId('barcode-last')).toHaveText(
        'ean_13: 4006381333931',
      );
    });

    test('barcode page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/barcode${fw.query}`);
      await expect(
        card(page, 'generate').getByRole('img', { name: /QR code/ }),
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
