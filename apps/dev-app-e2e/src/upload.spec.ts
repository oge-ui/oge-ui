import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * In-memory payloads rather than on-disk fixtures: this repo has no fixtures
 * directory and `core.autocrlf` is active, so a committed text file would have
 * different bytes on a Windows checkout than on Ubuntu CI — and any assertion
 * on a size would fail in exactly one of the two places.
 */
const png = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
});

const text = (name: string, size = 32) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.alloc(size, 0x61),
});

async function openUpload(page: Page) {
  await page.goto('/components/upload');
  await expect(page.locator('oge-file-uploader').first()).toBeVisible();
}

/**
 * The demo card carrying this exact heading.
 *
 * Matched on the `h3`, not with `hasText`: that is a case-insensitive
 * substring match, so "Restrictions" also matches the Getting-started card,
 * whose description happens to mention restrictions.
 */
function section(page: Page, heading: string): Locator {
  return page.locator('app-demo-card').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });
}

/** The uploader inside the demo card with this heading. */
function card(page: Page, heading: string): Locator {
  return section(page, heading).locator('oge-file-uploader').first();
}

async function choose(
  uploader: Locator,
  files: readonly { name: string; mimeType: string; buffer: Buffer }[],
) {
  await uploader.locator('.oge-upload-input').setInputFiles([...files]);
}

test.describe('upload', () => {
  test('picks files from the dialog and lists them', async ({ page }) => {
    await openUpload(page);
    const uploader = card(page, 'Getting started');

    await choose(uploader, [png('one.png'), png('two.png')]);

    await expect(uploader.locator('.oge-upload-file')).toHaveCount(2);
    await expect(
      uploader.locator('.oge-upload-file-name', { hasText: 'one.png' }),
    ).toBeVisible();
  });

  test('accepts a real drag and drop of files', async ({ page }) => {
    await openUpload(page);
    const uploader = card(page, 'Getting started');
    const zone = uploader.locator('.oge-upload-dropzone');

    // Playwright's dragTo cannot carry files, so the DataTransfer is built in
    // the page. Chromium returns null from webkitGetAsEntry() for one of
    // these, which is exactly the fallback path the component keeps.
    const transfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(
        new File([new Uint8Array([1, 2, 3])], 'dropped.png', {
          type: 'image/png',
        }),
      );
      return dt;
    });

    await zone.dispatchEvent('dragenter', { dataTransfer: transfer });
    await zone.dispatchEvent('dragover', { dataTransfer: transfer });
    await zone.dispatchEvent('drop', { dataTransfer: transfer });

    await expect(
      uploader.locator('.oge-upload-file-name', { hasText: 'dropped.png' }),
    ).toBeVisible();
  });

  test('keeps a rejected file on the list with its reason', async ({
    page,
  }) => {
    await openUpload(page);
    const uploader = card(page, 'Restrictions');

    await choose(uploader, [text('notes.txt')]);

    const row = uploader.locator('.oge-upload-file').first();
    await expect(row).toHaveClass(/oge-upload-file-invalid/);
    await expect(row).toHaveAttribute('aria-invalid', 'true');
    await expect(row.locator('.oge-upload-file-error')).toContainText(
      'not allowed',
    );
  });

  test('uploads on the button and logs what went over the wire', async ({
    page,
  }) => {
    await openUpload(page);
    const demo = section(page, 'Uploading');
    const uploader = demo.locator('oge-file-uploader').first();

    await choose(uploader, [text('report.txt', 64)]);
    await demo.getByRole('button', { name: 'Upload' }).click();

    // The fake server's request log is the assertion surface: deterministic
    // text, no wall-clock waiting on progress.
    await expect(demo.locator('.app-request-log')).toContainText(
      'POST /api/upload — report.txt',
    );
    await expect(uploader.locator('.oge-upload-file-meta')).toContainText(
      'Uploaded',
    );
  });

  test('sends one request per chunk and recovers from the scripted failure', async ({
    page,
  }) => {
    test.slow();
    await openUpload(page);
    const demo = section(page, 'Chunked and resumable');
    const uploader = demo.locator('oge-file-uploader').first();

    await choose(uploader, [text('big.bin', 200)]);
    await demo.getByRole('button', { name: 'Upload' }).click();

    const log = demo.locator('.app-request-log');
    await expect(log).toContainText('chunk 1/4');
    await expect(log).toContainText('503 (scripted failure)');
    await expect(uploader.locator('.oge-upload-file-meta')).toContainText(
      'Uploaded',
    );
  });

  test('removes the focused row from the keyboard', async ({ page }) => {
    await openUpload(page);
    const uploader = card(page, 'Getting started');
    await choose(uploader, [png('one.png'), png('two.png')]);

    await uploader.locator('.oge-upload-file').first().focus();
    await page.keyboard.press('Delete');

    // No reference library removes a file from the keyboard; this is the
    // mouse affordance's missing twin.
    await expect(uploader.locator('.oge-upload-file')).toHaveCount(1);
    await expect(
      uploader.locator('.oge-upload-file-name', { hasText: 'two.png' }),
    ).toBeVisible();
  });

  test('moves the roving tab stop with the arrow keys', async ({ page }) => {
    await openUpload(page);
    const uploader = card(page, 'Getting started');
    await choose(uploader, [png('a.png'), png('b.png')]);

    await uploader.locator('.oge-upload-file').first().focus();
    await page.keyboard.press('ArrowDown');

    await expect(uploader.locator('.oge-upload-file').nth(1)).toBeFocused();
  });

  test('feeds an uploader from an external drop zone', async ({ page }) => {
    await openUpload(page);
    const demo = section(page, 'External drop zone');

    const transfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'panel.txt', { type: 'text/plain' }));
      return dt;
    });
    const panel = demo.locator('.app-drop-panel');
    await panel.dispatchEvent('dragover', { dataTransfer: transfer });
    await panel.dispatchEvent('drop', { dataTransfer: transfer });

    await expect(
      demo.locator('.oge-upload-file-name', { hasText: 'panel.txt' }),
    ).toBeVisible();
  });

  test('axe: no violations in either theme', async ({ page }) => {
    test.slow();
    await openUpload(page);
    await choose(card(page, 'Getting started'), [png('one.png')]);

    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('oge-file-uploader')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
