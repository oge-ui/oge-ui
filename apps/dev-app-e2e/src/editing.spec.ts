import { test, expect } from '@playwright/test';

test('batch editing: edit cells, delete a row, save as one change set', async ({
  page,
}) => {
  await page.goto('/components/data-grid/editing');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // edit first row's First Name (col index 1)
  await page.locator('.oge-row').first().locator('.oge-cell').nth(1).click();
  const editor = page.locator('.oge-editor');
  await expect(editor).toBeVisible();
  await editor.fill('Düzenlendi');
  await editor.press('Enter');
  await expect(page.locator('.oge-cell-dirty')).toHaveCount(1);
  await expect(
    page.locator('.oge-row').first().locator('.oge-cell').nth(1),
  ).toHaveText('Düzenlendi');

  // mark second row for deletion (strike-through)
  await page.locator('.oge-command-delete').nth(1).click();
  await expect(page.locator('.oge-row-removed')).toHaveCount(1);

  // save everything as one ordered change set
  await page.getByRole('button', { name: 'Save changes' }).click();
  const log = page.locator('.save-log li').first();
  await expect(log).toContainText('update #');
  await expect(log).toContainText('"firstName":"Düzenlendi"');
  await expect(log).toContainText('remove #');
  await expect(page.locator('.oge-cell-dirty')).toHaveCount(0);
  await expect(page.locator('.oge-row-removed')).toHaveCount(0);
});

test('validation blocks a required cell from committing', async ({ page }) => {
  await page.goto('/components/data-grid/editing');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  await page.locator('.oge-row').first().locator('.oge-cell').nth(1).click();
  const editor = page.locator('.oge-editor');
  await editor.fill('');
  await editor.press('Enter');
  // editor stays open with the invalid style; nothing was saved
  await expect(page.locator('.oge-editor-invalid')).toBeVisible();
  await expect(page.locator('.save-log li').first()).toContainText(
    'No saves yet',
  );

  await editor.press('Escape');
  await expect(page.locator('.oge-editor')).toHaveCount(0);
});

test('row mode edits via the command column', async ({ page }) => {
  test.slow(); // editor focus timing is sensitive under parallel CI load
  await page.goto('/components/data-grid/editing');
  const grid = page.locator('oge-grid').first();
  await page.getByRole('button', { name: 'row', exact: true }).click();
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  await grid.locator('[aria-label="Edit"]').first().click();
  const editors = grid.locator('.oge-editor');
  await expect(editors).toHaveCount(4); // firstName, lastName, department(select), salary
  await editors.first().fill('Satır Modu');
  await expect(editors.first()).toHaveValue('Satır Modu'); // editor kept focus & value
  await grid.locator('[aria-label="Save"]').click();
  await expect(
    grid.locator('.oge-row').first().locator('.oge-cell').nth(1),
  ).toHaveText('Satır Modu');
  await expect(page.locator('.save-log li').first()).toContainText(
    '"firstName":"Satır Modu"',
  );
});
