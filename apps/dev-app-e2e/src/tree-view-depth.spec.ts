import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Tree view depth (G5a) in both render layers: dragging a node from one tree
 * to another with the mouse and with the keyboard twin (Ctrl+X / Ctrl+V),
 * in-place label editing (F2) and "Load more" paging.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

function card(page: Page, heading: string): Locator {
  return page.locator('app-demo-card').filter({ hasText: heading });
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

for (const fw of FRAMEWORKS) {
  test.describe(`${fw.name} tree view depth`, () => {
    test('drags a node from one tree into another with the mouse', async ({
      page,
    }) => {
      await page.goto(`/components/tree-view${fw.query}`);
      const demo = card(page, 'Drag between trees');
      const [projects, archive] = [
        demo.locator('[role="tree"]').nth(0),
        demo.locator('[role="tree"]').nth(1),
      ];
      const landing = projects.getByRole('treeitem', { name: /Landing page/ });
      const target = archive.getByRole('treeitem', { name: /2024/ });
      await expect(landing).toBeVisible();

      const from = await center(landing);
      const to = await center(target);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 12 });
      // the target tree previews the drop zone while the drag hovers it
      await expect(target).toHaveClass(/oge-tree-view-item-drop-inside/);
      await page.mouse.up();

      await expect(demo.getByTestId('tree-transfer-log')).toHaveText(
        'Landing page → inside 2024 (pointer)',
      );
      await expect(
        projects.getByRole('treeitem', { name: /Landing page/ }),
      ).toHaveCount(0);
      // 2024 now has a child — the data change the app made from the events
      await expect(target).toHaveAttribute('aria-expanded', 'false');
    });

    test('moves a node between trees with Ctrl+X / Ctrl+V and announces it', async ({
      page,
    }) => {
      await page.goto(`/components/tree-view${fw.query}`);
      const demo = card(page, 'Drag between trees');
      const projects = demo.locator('[role="tree"]').nth(0);
      const archive = demo.locator('[role="tree"]').nth(1);
      const pricing = projects.getByRole('treeitem', { name: /Pricing page/ });
      await expect(pricing).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+X Control+V',
      );

      await pricing.focus();
      await page.keyboard.press('Control+x');
      await expect(pricing).toHaveClass(/oge-tree-view-item-cut/);
      await expect(
        page.locator('[data-oge-live-announcer="polite"]'),
      ).toContainText('Pricing page cut');

      const target = archive.getByRole('treeitem', { name: /2023/ });
      await target.focus();
      await page.keyboard.press('Control+v');
      await expect(demo.getByTestId('tree-transfer-log')).toHaveText(
        'Pricing page → inside 2023 (keyboard)',
      );
      await expect(
        page.locator('[data-oge-live-announcer="polite"]'),
      ).toContainText('Pricing page moved into 2023.');
      await expect(
        projects.getByRole('treeitem', { name: /Pricing page/ }),
      ).toHaveCount(0);
    });

    test('renames a node with F2: Enter commits, Escape cancels', async ({
      page,
    }) => {
      await page.goto(`/components/tree-view${fw.query}`);
      const demo = card(page, 'Label editing (F2)');
      const tree = demo.locator('[role="tree"]');
      const reports = tree.getByRole('treeitem', { name: /^Reports/ });
      await reports.focus();
      await page.keyboard.press('F2');
      const field = tree.getByRole('textbox', { name: 'Item name' });
      await expect(field).toBeFocused();
      await expect(field).toHaveValue('Reports');

      // the transient editor inside role="treeitem" must not fail axe
      const results = await new AxeBuilder({ page })
        .include('[role="tree"][aria-label="Renamable folders"]')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);

      await field.fill('Quarterly reports');
      await page.keyboard.press('Enter');
      await expect(demo.getByTestId('tree-edit-log')).toHaveText(
        '“Reports” → “Quarterly reports”',
      );
      await expect(
        tree.getByRole('treeitem', { name: /Quarterly reports/ }),
      ).toBeFocused();

      const photos = tree.getByRole('treeitem', { name: /^Photos/ });
      await photos.focus();
      await page.keyboard.press('F2');
      await field.fill('Nope');
      await page.keyboard.press('Escape');
      await expect(field).toHaveCount(0);
      await expect(photos).toBeFocused();
      await expect(tree.getByRole('treeitem', { name: /Nope/ })).toHaveCount(0);
    });

    test('pages children behind a keyboard-reachable Load more row', async ({
      page,
    }) => {
      await page.goto(`/components/tree-view${fw.query}`);
      const tree = card(page, 'Load more paging').locator('[role="tree"]');
      const first = tree.getByRole('treeitem', {
        name: 'Message 1',
        exact: true,
      });
      await expect(first).toHaveAttribute('aria-setsize', '23');
      const more = tree.locator('.oge-tree-view-item-more').first();
      await expect(more).toHaveText('Show 18 more items');
      await expect(more).toHaveAttribute('role', 'treeitem');

      await tree
        .getByRole('treeitem', { name: 'Message 5', exact: true })
        .focus();
      await page.keyboard.press('ArrowDown');
      await expect(more).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(
        tree.getByRole('treeitem', { name: 'Message 6', exact: true }),
      ).toBeFocused();
      await expect(more).toHaveText('Show 13 more items');

      await more.click();
      await expect(more).toHaveText('Show 8 more items');

      const results = await new AxeBuilder({ page })
        .include('[role="tree"][aria-label="Mail folders"]')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
