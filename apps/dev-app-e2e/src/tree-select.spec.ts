import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('picks a node and closes, showing its label in the field', async ({
  page,
}) => {
  await page.goto('/components/inputs/tree-select');
  const card = page.locator('app-demo-card').filter({ hasText: 'Basic usage' });
  const field = card.getByRole('combobox');

  await expect(field).toHaveAttribute('aria-haspopup', 'tree');
  await expect(field).toHaveAttribute('aria-expanded', 'false');

  await field.click();
  await expect(field).toHaveAttribute('aria-expanded', 'true');

  const tree = page.locator('.oge-tree-select-panel [role="tree"]');
  await expect(tree).toBeVisible();
  // aria-controls must point at the tree itself, not the panel
  const controls = await field.getAttribute('aria-controls');
  await expect(page.locator(`#${controls}`)).toHaveAttribute('role', 'tree');

  await page.getByRole('treeitem', { name: /Reports/ }).click();
  await expect(field).toHaveAttribute('aria-expanded', 'false');
  await expect(field).toHaveValue('Reports');
});

test('opens with the keyboard and moves focus into the tree', async ({
  page,
}) => {
  await page.goto('/components/inputs/tree-select');
  const card = page.locator('app-demo-card').filter({ hasText: 'Basic usage' });
  const field = card.getByRole('combobox');

  await field.focus();
  await field.press('ArrowDown');
  await expect(field).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[role="treeitem"][tabindex="0"]')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(field).toHaveAttribute('aria-expanded', 'false');
  await expect(field).toBeFocused();
});

test('the chevron expands without choosing the node', async ({ page }) => {
  await page.goto('/components/inputs/tree-select');
  const card = page.locator('app-demo-card').filter({ hasText: 'Basic usage' });
  const field = card.getByRole('combobox');

  await field.click();
  const documents = page.getByRole('treeitem', { name: /Documents/ });
  await documents.locator('.oge-tree-view-toggle').click();

  // still open, nothing committed — expanding is not picking
  await expect(field).toHaveAttribute('aria-expanded', 'true');
  await expect(field).toHaveValue('');
});

test('multiple selection cascades and reports only the leaves', async ({
  page,
}) => {
  await page.goto('/components/inputs/tree-select');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Multiple selection' });

  const field = card.getByRole('combobox');
  await field.click();
  await page
    .getByRole('treeitem', { name: /Reports/ })
    .locator('.oge-tree-view-check')
    .click();

  // Reports cascades to Q1.pdf + Q2.pdf; leavesOnly drops the parent, and the
  // field renders the labels of those keys
  await expect(field).toHaveValue('Q1.pdf, Q2.pdf');
  // the popup stays open for further picks
  await expect(field).toHaveAttribute('aria-expanded', 'true');
});

test('lazy children load inside the popup', async ({ page }) => {
  await page.goto('/components/inputs/tree-select');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Lazy load on demand' });

  await card.getByRole('combobox').click();
  await page
    .getByRole('treeitem', { name: /Server root/ })
    .locator('.oge-tree-view-toggle')
    .click();
  await expect(
    page.getByRole('treeitem', { name: /Server root \/ logs/ }),
  ).toBeVisible();
});

test('tree select page has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/inputs/tree-select');
  // scope to the editor: the docs shell has comboboxes of its own
  const field = page.locator('.oge-tree-select').first().getByRole('combobox');
  await expect(field).toBeVisible();
  await field.click();
  await expect(page.locator('.oge-tree-select-panel')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('.oge-tree-select')
    .include('.oge-tree-select-panel')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
