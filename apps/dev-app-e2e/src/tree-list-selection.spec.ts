import { expect, test } from '@playwright/test';

test('recursive checkbox selection cascades and turns ancestors indeterminate', async ({
  page,
}) => {
  await page.goto('/components/tree-list/selection');
  const tree = page.locator('oge-tree-list');
  const rows = tree.locator('.oge-row');

  // check a VP (level 2): the whole subtree becomes checked
  const vpCheckbox = rows.nth(1).locator('.oge-checkbox-cell input');
  await vpCheckbox.check();
  const directorCheckbox = rows.nth(2).locator('.oge-checkbox-cell input');
  await expect(directorCheckbox).toBeChecked();

  // the selected-keys readout tracks the model: the VP subtree is
  // 1 VP + 3 directors + 15 engineers = 19 keys
  const readout = page.locator('text=Selected keys');
  await expect(readout).toContainText('Selected keys (19):');

  // uncheck one engineer: the VP flips to indeterminate
  const engineerCheckbox = rows.nth(3).locator('.oge-checkbox-cell input');
  await engineerCheckbox.uncheck();
  await expect
    .poll(() => vpCheckbox.evaluate((el: HTMLInputElement) => el.indeterminate))
    .toBe(true);

  // normalize-up drops the engineer plus its deselected VP/director ancestors
  await expect(readout).toContainText('Selected keys (16):');
});
