import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The theming pages (W6c): `/getting-started/tokens` (the generated token
 * reference) and `/getting-started/theme-builder` (live token editing,
 * contrast checks, CSS / JSON export, shareable state).
 */

test.use({ locale: 'en-US', timezoneId: 'UTC' });

async function axe(page: Page): Promise<void> {
  // the breadcrumb belongs to the shared doc header (every docs page has it)
  const results = await new AxeBuilder({ page })
    .include('main')
    .exclude('app-doc-header nav')
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
}

test.describe('token reference', () => {
  test('filters by text and by category', async ({ page }) => {
    await page.goto('/getting-started/tokens');
    const table = page.getByRole('table');
    await expect(
      table.getByRole('rowheader', { name: /^--oge-accent\b/ }).first(),
    ).toBeVisible();
    const count = page.getByTestId('token-count');
    const total = Number((await count.textContent())?.match(/of (\d+)/)?.[1]);
    expect(total).toBeGreaterThan(50);

    await page.getByRole('searchbox', { name: 'Filter tokens' }).fill('soft');
    await expect
      .poll(async () =>
        (await table.locator('tbody th[scope="row"] a').allTextContents()).map(
          (text) => text.trim(),
        ),
      )
      .toEqual(
        expect.arrayContaining(['--oge-accent-soft', '--oge-danger-soft']),
      );
    await expect(table.locator('th#oge-bg')).toHaveCount(0);
    await expect(count).not.toContainText(`${total} of ${total}`);

    await page.getByRole('searchbox', { name: 'Filter tokens' }).fill('');
    await page
      .getByRole('group', { name: 'Filter by category' })
      .getByRole('button', { name: 'Z-index' })
      .click();
    await expect
      .poll(async () => {
        const names = await table
          .locator('tbody th[scope="row"] a')
          .allTextContents();
        return (
          names.length > 0 &&
          names.every((n) => n.trim().startsWith('--oge-z-'))
        );
      })
      .toBe(true);
  });

  test('shows theme values with swatches and a deep link lands on its row', async ({
    page,
  }) => {
    await page.goto('/getting-started/tokens#oge-z-modal');
    await expect(page.locator('th#oge-z-modal')).toBeInViewport();
    const accent = page.locator('tr:has(th#oge-accent)');
    await expect(accent).toContainText('#2563eb');
    await expect(accent).toContainText('#60a5fa');
    await expect(accent.locator('.app-token-chip')).toHaveCount(5);
  });

  test('the search palette finds a token', async ({ page }) => {
    await page.goto('/getting-started');
    await page.keyboard.press('Control+k');
    const box = page.getByRole('combobox', {
      name: 'Search the documentation',
    });
    await expect(box).toBeFocused();
    await box.fill('oge-z-toast');
    const option = page.getByRole('option', { name: /--oge-z-toast/ });
    await expect(option.first()).toBeVisible();
    await option.first().click();
    await expect(page).toHaveURL(/\/getting-started\/tokens#oge-z-toast$/);
    await expect(page.locator('th#oge-z-toast')).toBeInViewport();
  });

  test('has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/getting-started/tokens');
    await expect(page.getByRole('table')).toBeVisible();
    await axe(page);
  });
});

test.describe('theme builder', () => {
  /** Types a colour into one of the builder's colour boxes and commits it. */
  async function setColor(page: Page, label: string, hex: string) {
    const input = page.getByRole('combobox', { name: label, exact: true });
    await input.fill(hex);
    await input.press('Enter');
  }

  const previewVar = (page: Page, name: string) =>
    page
      .getByTestId('theme-preview')
      .evaluate(
        (el, token) => getComputedStyle(el).getPropertyValue(token).trim(),
        name,
      );

  test('a new accent updates the preview, the export and the URL', async ({
    page,
  }) => {
    await page.goto('/getting-started/theme-builder');
    // the builder applies its stylesheet once hydrated
    await expect.poll(() => previewVar(page, '--oge-accent')).toBe('#2563eb');

    await setColor(page, 'Accent', '#ff00aa');
    await expect.poll(() => previewVar(page, '--oge-accent')).toBe('#ff00aa');
    const save = page
      .getByTestId('theme-preview')
      .locator('oge-button')
      .filter({ hasText: /^\s*Save\s*$/ })
      .locator('button');
    await expect
      .poll(() => save.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe('rgb(255, 0, 170)');
    await expect(page.getByTestId('theme-export')).toContainText(
      '--oge-accent: #ff00aa;',
    );
    await expect(page).toHaveURL(/[?&]theme=a\.ff00aa/);

    await page
      .getByRole('group', { name: 'Export format' })
      .getByRole('button', { name: 'Scoped CSS' })
      .click();
    await expect(page.getByTestId('theme-export')).toContainText(
      "[data-oge-theme='my-theme']",
    );
  });

  test('a low-contrast accent raises the contrast warning', async ({
    page,
  }) => {
    await page.goto('/getting-started/theme-builder');
    await expect.poll(() => previewVar(page, '--oge-accent')).toBe('#2563eb');
    await expect(page.getByTestId('contrast-warning')).toHaveCount(0);
    await setColor(page, 'Accent', '#f0f0f0');
    await expect(page.getByTestId('contrast-warning')).toContainText(
      'accent text and links on background',
    );
    await expect(page.locator('[data-check="accent-bg"]')).toContainText(
      'Fails AA',
    );
  });

  test('a shared link restores the preset and the edits', async ({ page }) => {
    await page.goto(
      '/getting-started/theme-builder?theme=p.dark~a.ff00aa~r.12',
    );
    await expect.poll(() => previewVar(page, '--oge-bg')).toBe('#111827');
    await expect.poll(() => previewVar(page, '--oge-accent')).toBe('#ff00aa');
    await expect.poll(() => previewVar(page, '--oge-radius')).toBe('12px');
    await expect(
      page
        .getByRole('group', { name: 'Start from a preset' })
        .getByRole('button', { name: 'Dark' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('theme-export')).toContainText(
      'color-scheme: dark;',
    );
  });

  test('React readers are told the tokens are shared', async ({ page }) => {
    await page.goto('/getting-started/theme-builder?framework=react');
    await expect(page.getByTestId('react-note')).toBeVisible();
  });

  test('has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/getting-started/theme-builder');
    await expect.poll(() => previewVar(page, '--oge-accent')).toBe('#2563eb');
    await expect(page.locator('.oge-row').first()).toBeVisible();
    await axe(page);
  });
});
