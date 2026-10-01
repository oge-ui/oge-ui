import { test, expect } from '@playwright/test';

/**
 * Keyboard twin of the tree list's drag reparenting (WCAG 2.1.1 / 2.5.7):
 * Ctrl+ArrowUp/Down move a row among its siblings, Ctrl+ArrowRight indents,
 * Ctrl+ArrowLeft outdents — through the same drop path and the same reparent
 * event as a handle drag, in both render layers.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const fw of FRAMEWORKS) {
  test(`${fw.name} tree list: keyboard move, outdent and indent`, async ({
    page,
  }) => {
    await page.goto(`/components/tree-list/drag-drop${fw.query}`);
    const card = page.locator('app-demo-card').first();
    const tree = card.locator('.oge-tree-list');
    const rows = tree.locator('.oge-row');
    const nameAt = (index: number) =>
      rows.nth(index).locator('[data-cell$="-0"]');
    await expect(rows.nth(3)).toBeVisible({ timeout: 30_000 });
    const engineer = (await nameAt(3).innerText()).trim();
    const sibling = (await nameAt(4).innerText()).trim();

    // first engineer under the first director: move it down one sibling
    await nameAt(3).click();
    await nameAt(3).press('Control+ArrowDown');
    await expect(nameAt(3)).toHaveText(sibling);
    await expect(nameAt(4)).toHaveText(engineer);
    await expect(card).toContainText('Moved #4 from parent 3 to 3.');
    await expect(tree.locator('.oge-grid-announcer')).toHaveText(
      'Row moved to level 4, position 2 of 4',
    );
    await expect(nameAt(4)).toBeFocused();

    // outdent: it now follows its old director, one level up
    await page.keyboard.press('Control+ArrowLeft');
    await expect(card).toContainText('Moved #4 from parent 3 to 2.');
    await expect(tree.locator('.oge-grid-announcer')).toContainText(
      'Row moved to level 3',
    );
    const moved = rows.filter({ hasText: engineer }).first();
    await expect(moved).toHaveAttribute('aria-level', '3');

    // indent: back under the previous sibling (the director)
    await page.keyboard.press('Control+ArrowRight');
    await expect(card).toContainText('Moved #4 from parent 2 to 3.');
    await expect(rows.filter({ hasText: engineer }).first()).toHaveAttribute(
      'aria-level',
      '4',
    );
  });

  test(`${fw.name} tree list: Alt+Arrow resizes, Ctrl+Shift+Arrow moves columns`, async ({
    page,
  }) => {
    await page.goto(`/components/tree-list/drag-drop${fw.query}`);
    const tree = page.locator('app-demo-card .oge-tree-list').first();
    const headers = tree.locator(
      '.oge-header-row > .oge-header-cell[data-colid]',
    );
    await expect(headers).toHaveCount(3, { timeout: 30_000 });
    const title = tree.locator(
      '.oge-header-row > .oge-header-cell[data-colid="title"]',
    );
    const before = (await title.boundingBox())!.width;
    await title.focus();
    await title.press('Alt+ArrowRight');
    await expect
      .poll(async () => (await title.boundingBox())!.width)
      .toBeCloseTo(before + 10, 0);
    await title.press('Control+Shift+ArrowLeft');
    await expect
      .poll(() =>
        headers.evaluateAll((cells) =>
          cells.map((cell) => cell.getAttribute('data-colid')),
        ),
      )
      .toEqual(['title', 'name', 'office']);
    await expect(tree.locator('.oge-grid-announcer')).toHaveText(
      'Title moved to position 1 of 3',
    );
  });
}
