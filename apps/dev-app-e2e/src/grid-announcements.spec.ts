import { test, expect, type Page } from '@playwright/test';

/**
 * Screen-reader semantics of the data grid in both render layers: sorting
 * speaks through the document's one shared polite live region
 * (`OgeLiveAnnouncerCore`), and an invalid cell editor is `aria-invalid` with
 * its error text associated through `aria-errormessage` / `aria-describedby`.
 */
const VIEWS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const polite = (page: Page) =>
  page.locator('[data-oge-live-announcer="polite"]');
const assertive = (page: Page) =>
  page.locator('[data-oge-live-announcer="assertive"]');

for (const view of VIEWS) {
  test.describe(`${view.name} grid announcements`, () => {
    test('a header sort is announced in the shared live region', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid${view.query}`);
      const grid = page.locator('.oge-grid').first();
      await expect(grid.locator('.oge-row').first()).toBeVisible();
      const header = grid.getByRole('columnheader', { name: 'Id' });

      await header.click();
      await expect(header).toHaveAttribute('aria-sort', 'ascending');
      await expect(polite(page)).toHaveText('Sorted by Id, ascending');
      await expect(polite(page)).toHaveAttribute('aria-live', 'polite');
      // one region per document, however many grids the page hosts
      await expect(polite(page)).toHaveCount(1);

      await header.click();
      await expect(polite(page)).toHaveText('Sorted by Id, descending');
    });

    test('an invalid edit is aria-invalid and points at its error message', async ({
      page,
    }) => {
      await page.goto(`/components/data-grid/editing${view.query}`);
      const grid = page.locator('.oge-grid').first();
      await expect(grid.locator('.oge-row').first()).toBeVisible();

      await grid
        .locator('.oge-row')
        .first()
        .locator('.oge-cell')
        .nth(1)
        .click();
      const editor = grid.locator('.oge-editor .oge-input-native');
      await expect(editor).toBeVisible();
      await editor.fill('');
      await editor.press('Enter');

      await expect(editor).toHaveAttribute('aria-invalid', 'true');
      await expect(editor).toHaveAttribute('aria-errormessage', /\S/);
      const errorId = (await editor.getAttribute('aria-errormessage')) ?? '';
      await expect(editor).toHaveAttribute(
        'aria-describedby',
        new RegExp(`(^|\\s)${errorId}(\\s|$)`),
      );
      await expect(page.locator(`[id="${errorId}"]`)).toHaveText(
        'This field is required',
      );
      // the accessible description is what a screen reader reads on focus
      await expect(editor).toHaveAccessibleDescription(
        /This field is required/,
      );
      await expect(assertive(page)).toHaveText(
        'First Name: This field is required',
      );

      await editor.press('Escape');
      await expect(grid.locator('.oge-editor')).toHaveCount(0);
    });
  });
}
