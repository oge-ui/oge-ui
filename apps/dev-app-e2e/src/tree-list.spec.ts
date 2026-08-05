import { expect, test } from '@playwright/test';

test('renders the org tree with treegrid semantics and expands/collapses', async ({
  page,
}) => {
  await page.goto('/components/tree-list');
  const tree = page.locator('oge-tree-list');
  await expect(tree.locator('.oge-viewport')).toHaveAttribute(
    'role',
    'treegrid',
  );

  // autoExpandAll: root (level 1) and engineers (level 4) are all visible
  const rows = tree.locator('.oge-row');
  await expect(rows.first()).toHaveAttribute('aria-level', '1');
  await expect(tree.locator('.oge-row[aria-level="4"]').first()).toBeVisible();
  const expandedCount = await rows.count();

  // collapsing the root hides everything below it
  await rows.first().locator('.oge-tree-expander').click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('aria-expanded', 'false');

  // re-expand restores the exact same row count
  await rows.first().locator('.oge-tree-expander').click();
  await expect(rows).toHaveCount(expandedCount);
});

test('indents by level and reports ARIA position within siblings', async ({
  page,
}) => {
  await page.goto('/components/tree-list');
  const level2 = page.locator('oge-tree-list .oge-row[aria-level="2"]').first();
  await expect(level2).toHaveAttribute('aria-posinset', '1');
  const indent = level2.locator('.oge-tree-indent');
  await expect(indent).toHaveCSS('inline-size', '20px');
});

test('keyboard: ArrowLeft collapses, ArrowRight expands from the first column', async ({
  page,
}) => {
  await page.goto('/components/tree-list');
  const tree = page.locator('oge-tree-list');
  const firstCell = tree.locator('.oge-row .oge-cell').first();
  await firstCell.click();
  await page.keyboard.press('ArrowLeft');
  await expect(tree.locator('.oge-row')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(tree.locator('.oge-row[aria-level="2"]').first()).toBeVisible();
});
