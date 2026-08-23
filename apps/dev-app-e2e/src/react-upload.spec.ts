import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the upload family (ADR 0002 + `docs/REACT-PARITY.md`):
 * the overview and API pages render the real React uploader on the same
 * routes the Angular view uses, the selection pipeline and the keyboard
 * contract work, and the pages are axe-clean.
 *
 * Fixtures are in-memory buffers, like the Angular spec: a committed text
 * file would have different bytes on Windows and Ubuntu under `autocrlf`.
 */
const REACT = '?framework=react';

const png = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
});
const text = (name: string, size = 12) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.alloc(size, 'a'),
});

/** The h3 is matched exactly — `hasText` is a substring match. */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

async function choose(card: Locator, files: ReturnType<typeof text>[]) {
  await card.locator('.oge-upload-input').setInputFiles(files);
}

test.describe('React upload docs', () => {
  test('the overview mounts the React uploader without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/upload${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.locator('app-react-host .oge-upload').first(),
    ).toBeVisible();
  });

  test('the api page renders the React table', async ({ page }) => {
    await page.goto(`/components/upload/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '<OgeFileUploader>' }),
    ).toBeVisible();
  });

  test('picks files from the dialog and lists them', async ({ page }) => {
    await page.goto(`/components/upload${REACT}`);
    const card = section(page, 'Getting started');
    await choose(card, [png('one.png'), png('two.png')]);
    await expect(card.locator('.oge-upload-file')).toHaveCount(2);
    await expect(card.getByText('one.png')).toBeVisible();
    await expect(card.getByText('2 file(s) ready')).toBeVisible();
  });

  test('keeps a rejected file on the list with its reason', async ({
    page,
  }) => {
    await page.goto(`/components/upload${REACT}`);
    const card = section(page, 'Restrictions');
    await choose(card, [text('notes.txt')]);
    const row = card.locator('.oge-upload-file').first();
    await expect(row).toHaveClass(/oge-upload-file-invalid/);
    await expect(row).toHaveAttribute('aria-invalid', 'true');
    await expect(row.locator('.oge-upload-file-error')).toContainText(
      'File type is not allowed',
    );
  });

  test('uploads on the button and logs what went over the wire', async ({
    page,
  }) => {
    await page.goto(`/components/upload${REACT}`);
    const card = section(page, 'Uploading');
    await choose(card, [text('report.txt', 40)]);
    await card.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(card.locator('.app-request-log')).toContainText(
      'POST /api/upload',
    );
    await expect(card.locator('.oge-upload-file-meta').first()).toContainText(
      'Uploaded',
    );
  });

  test('removes the focused row from the keyboard', async ({ page }) => {
    await page.goto(`/components/upload${REACT}`);
    const card = section(page, 'Getting started');
    await choose(card, [png('one.png'), png('two.png')]);
    const rows = card.locator('.oge-upload-file');
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press('Delete');
    await expect(rows).toHaveCount(1);
    await expect(card.getByText('one.png')).toBeVisible();
  });

  test('feeds an uploader from an external drop zone', async ({ page }) => {
    await page.goto(`/components/upload${REACT}`);
    const card = section(page, 'External drop zone');
    const panel = card.locator('.app-drop-panel');
    await expect(panel).toBeVisible();
    const transfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['hello'], 'panel.txt', { type: 'text/plain' }));
      return dt;
    });
    await panel.dispatchEvent('dragenter', { dataTransfer: transfer });
    await panel.dispatchEvent('drop', { dataTransfer: transfer });
    // by the row's name cell — the live region announces the same text
    await expect(
      card.locator('.oge-upload-file-name', { hasText: 'panel.txt' }),
    ).toBeVisible();
  });

  for (const path of ['/components/upload', '/components/upload/api']) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views — a best-practice flag, not a WCAG
      // failure, and not something the React layer introduced.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
