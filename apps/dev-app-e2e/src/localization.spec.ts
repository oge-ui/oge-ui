import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The localization page's live demo: one grid, four locales. Cell text, the
 * total summary, the filter row's number parsing and the plural sentence
 * follow the selected locale — in both render layers.
 */
const PATH = '/getting-started/localization';

function demo(page: Page) {
  return page.locator('.app-locale-demo').first();
}

function firstRowCells(page: Page) {
  return demo(page).locator('.oge-row').first().locator('.oge-cell');
}

async function pick(page: Page, locale: string): Promise<void> {
  const button = demo(page)
    .getByRole('group', { name: 'Locale' })
    .getByRole('button', { name: locale, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

for (const [layer, query] of [
  ['Angular', ''],
  ['React', '?framework=react'],
] as const) {
  test.describe(`localization demo (${layer})`, () => {
    test('switches number, currency, percent and date formats', async ({
      page,
    }) => {
      await page.goto(`${PATH}${query}`);
      await expect(firstRowCells(page).first()).toBeVisible();

      // de-DE is the initial locale
      await expect(firstRowCells(page).nth(1)).toHaveText('5.1.2026');
      await expect(
        demo(page)
          .locator('.oge-row')
          .first()
          .getByText(/1\.234,50\s€/),
      ).toBeVisible();

      await pick(page, 'en-US');
      await expect(firstRowCells(page).nth(1)).toHaveText('1/5/2026');
      await expect(
        demo(page).locator('.oge-row').first().getByText('€1,234.50'),
      ).toBeVisible();
      await expect(
        demo(page).locator('.oge-row').first().getByText('12.5%'),
      ).toBeVisible();

      await pick(page, 'tr-TR');
      await expect(
        demo(page).locator('.oge-row').first().getByText('%12,5'),
      ).toBeVisible();

      // ar-EG renders native digits; the unformatted id column stays raw
      await pick(page, 'ar-EG');
      await expect(firstRowCells(page).first()).toHaveText('1');
      await expect(firstRowCells(page).nth(1)).toHaveText(/[٠-٩]/);
      await expect(demo(page).locator('.app-locale-summary')).toHaveText(/٣/);
    });

    test('parses the filter row in the locale and pluralizes the summary', async ({
      page,
    }) => {
      await page.goto(`${PATH}${query}`);
      await expect(firstRowCells(page).first()).toBeVisible();
      await expect(demo(page).locator('.app-locale-summary')).toHaveText(
        '3 orders',
      );
      await demo(page).getByLabel('Filter Amount').fill('1234,5');
      await expect(demo(page).locator('.oge-row')).toHaveCount(1);
      await expect(firstRowCells(page).first()).toHaveText('1');
    });

    test('the demo is axe-clean', async ({ page }) => {
      await page.goto(`${PATH}${query}`);
      await expect(firstRowCells(page).first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.app-locale-demo')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
