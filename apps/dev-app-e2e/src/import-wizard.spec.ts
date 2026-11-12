import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

const sample = (name: string) =>
  resolve(__dirname, '../../dev-app/public/demo/import', name);

/** The React view is the same route with `?framework=react`. */
for (const view of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
]) {
  test.describe(`Import wizard (${view.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/spreadsheet/import${view.query}`);
      await expect(page.locator('.oge-import').first()).toBeVisible();
    });

    test('imports a CSV file: matching, review, valid rows only', async ({
      page,
    }) => {
      const wizard = page.locator('.oge-import').first();
      await wizard
        .locator('input[type="file"]')
        .setInputFiles(sample('contacts.csv'));
      await expect(wizard.locator('[aria-current="step"]')).toHaveText(
        'Match columns',
      );
      // headers matched by label, the extra-free file maps every column
      await expect(
        wizard.getByRole('combobox', { name: 'Start date' }),
      ).toHaveValue('startDate');
      await wizard.getByRole('button', { name: 'Next' }).click();
      await expect(wizard.locator('.oge-import-summary')).toContainText(
        '6 of 10 rows ready',
      );
      await expect(wizard.locator('.oge-import-summary')).toContainText(
        '4 rows have problems',
      );
      await wizard.getByLabel('Show only rows with problems').check();
      await expect(wizard.locator('.oge-import-review tbody tr')).toHaveCount(
        4,
      );
      await expect(
        wizard.locator('.oge-import-cell-error').first(),
      ).toHaveAttribute('title', 'Not an email address');
      await wizard.getByRole('button', { name: 'Import 6 rows' }).click();
      await expect(wizard.locator('.oge-import-done')).toHaveText(
        '6 rows imported, 4 skipped',
      );
      await expect(page.getByText('6 records saved')).toBeVisible();
    });

    test('reads an Excel workbook dropped on the zone', async ({ page }) => {
      const wizard = page.locator('.oge-import').first();
      const bytes = readFileSync(sample('contacts.xlsx')).toString('base64');
      const transfer = await page.evaluateHandle((data) => {
        const binary = atob(data);
        const array = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const dt = new DataTransfer();
        dt.items.add(new File([array], 'contacts.xlsx'));
        return dt;
      }, bytes);
      await wizard
        .locator('.oge-import-drop')
        .dispatchEvent('drop', { dataTransfer: transfer });
      await expect(wizard.getByRole('combobox', { name: 'Sheet' })).toHaveValue(
        '0',
      );
      await wizard.getByRole('button', { name: 'Next' }).click();
      // typed Excel cells: the date and the boolean need no parsing
      await expect(wizard.locator('.oge-import-summary')).toContainText(
        '6 of 10 rows ready',
      );
    });

    test('parses decimal commas and day-first dates', async ({ page }) => {
      const wizard = page.locator('.oge-import').nth(1);
      await page.getByRole('button', { name: 'Load products.csv' }).click();
      await expect(wizard.getByRole('combobox', { name: 'Fiyat' })).toHaveValue(
        'price',
      );
      await wizard.getByRole('button', { name: 'Next' }).click();
      await expect(
        wizard.locator('.oge-import-review tbody tr').first(),
      ).toContainText('1234.5');
      await expect(wizard.locator('.oge-import-summary')).toContainText(
        '2 of 3 rows ready',
      );
    });

    test('has no axe violations on the mapping and review steps', async ({
      page,
    }) => {
      const wizard = page.locator('.oge-import').first();
      await wizard
        .locator('input[type="file"]')
        .setInputFiles(sample('contacts.csv'));
      await expect(wizard.locator('.oge-import-mapping')).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).include('.oge-import').analyze())
          .violations,
      ).toEqual([]);
      await wizard.getByRole('button', { name: 'Next' }).click();
      await expect(wizard.locator('.oge-import-review')).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).include('.oge-import').analyze())
          .violations,
      ).toEqual([]);
    });
  });
}
