import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('expands and collapses nodes, exposing the APG hierarchy', async ({
  page,
}) => {
  await page.goto('/components/tree-view');
  const tree = page.locator('.oge-tree-view').first();
  const documents = tree.getByRole('treeitem', { name: /Documents/ });

  await expect(documents).toHaveAttribute('aria-level', '1');
  await expect(documents).toHaveAttribute('aria-expanded', 'true');
  await expect(tree.getByRole('treeitem', { name: /Reports/ })).toBeVisible();

  await documents.click();
  await expect(documents).toHaveAttribute('aria-expanded', 'false');
  await expect(tree.getByRole('treeitem', { name: /Reports/ })).toHaveCount(0);
});

test('arrow keys follow the treeview semantics with one node tabbable', async ({
  page,
}) => {
  await page.goto('/components/tree-view');
  const tree = page.locator('.oge-tree-view').first();
  const documents = tree.getByRole('treeitem', { name: /Documents/ });

  await documents.focus();
  await expect(documents).toHaveAttribute('tabindex', '0');
  await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);

  // Right on an open parent moves to the first child
  await documents.press('ArrowRight');
  await expect(tree.getByRole('treeitem', { name: /Reports/ })).toBeFocused();

  // Left on a closed child moves back to the parent
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(documents).toBeFocused();

  await page.keyboard.press('End');
  await expect(tree.locator('[role="treeitem"]').last()).toBeFocused();
});

test('checkbox selection cascades and shows a mixed parent', async ({
  page,
}) => {
  await page.goto('/components/tree-view');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Checkboxes & cascade' });
  const reports = card.getByRole('treeitem', { name: /Reports/ });

  await reports.locator('.oge-tree-view-check').click();
  await expect(reports).toHaveAttribute('aria-checked', 'true');
  await expect(card.getByRole('treeitem', { name: /Q1\.pdf/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // Documents also has Contracts, so it is only partly covered
  await expect(
    card.getByRole('treeitem', { name: /Documents/ }),
  ).toHaveAttribute('aria-checked', 'mixed');
});

test('search narrows the tree and highlights the match', async ({ page }) => {
  await page.goto('/components/tree-view');
  const card = page.locator('app-demo-card').filter({ hasText: 'Search' });

  await card.locator('.oge-tree-view-search-input').fill('Holiday');
  await expect(card.getByRole('treeitem', { name: /Holiday/ })).toBeVisible();
  await expect(card.getByRole('treeitem', { name: /Contracts/ })).toHaveCount(
    0,
  );
  await expect(card.locator('mark.oge-highlight').first()).toHaveText(
    'Holiday',
  );
});

test('lazy children load behind a placeholder row', async ({ page }) => {
  await page.goto('/components/tree-view');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Lazy load on demand' });

  await card.getByRole('treeitem', { name: /Server root/ }).click();
  await expect(card.locator('.oge-tree-view-item-filler')).toBeVisible();
  await expect(
    card.getByRole('treeitem', { name: /Server root \/ logs/ }),
  ).toBeVisible();
  await expect(card.locator('.oge-tree-view-item-filler')).toHaveCount(0);
});

test('virtual scrolling renders a window of 10 000 nodes', async ({ page }) => {
  await page.goto('/components/tree-view');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Virtual scrolling' });
  const rows = card.locator('[role="treeitem"]');

  // the 10 000-node demo is the heaviest block on the page — wait for it to
  // render before counting, or a loaded run reads zero rows
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toHaveText(/Item 1$/);

  const initial = await rows.count();
  expect(initial).toBeGreaterThan(0);
  expect(initial).toBeLessThan(200);

  await card.locator('.oge-tree-view-scroll').evaluate((el) => {
    el.scrollTop = 9000;
  });
  await expect(rows.first()).not.toHaveText(/Item 1$/);
  await expect(rows.first()).toBeVisible();
});

test('tree view overview has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/tree-view');
  await expect(page.locator('[role="treeitem"]').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-tree-view')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
