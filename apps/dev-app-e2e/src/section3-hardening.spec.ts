import { expect, test } from '@playwright/test';

/**
 * Component hardening in both render layers: button variants and the
 * page-owned pressed state, the confirm gates, the modal's loading state and
 * blocked closes, and the tree view's drag rules.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const fw of FRAMEWORKS) {
  test.describe(`component hardening (${fw.name})`, () => {
    test('pressed follows the page, link and pill render', async ({ page }) => {
      await page.goto(`/components/buttons${fw.query}`);
      const demo = page.getByTestId('shapes-demo').first();
      await demo.scrollIntoViewIfNeeded();
      const grid = demo.getByRole('button', { name: 'Grid' });
      const list = demo.getByRole('button', { name: 'List' });
      await expect(grid).toHaveAttribute('aria-pressed', 'true');
      await expect(list).toHaveAttribute('aria-pressed', 'false');
      await list.click();
      await expect(list).toHaveAttribute('aria-pressed', 'true');
      await expect(grid).toHaveAttribute('aria-pressed', 'false');
      await expect(demo.locator('.oge-button-link-mode')).toHaveCount(1);
      await expect(demo.locator('.oge-button-pill')).toHaveCount(1);
      await demo.getByRole('button', { name: 'Save' }).click();
      await expect(demo.getByRole('button', { name: 'Saving…' })).toBeVisible();
    });

    test('confirm gates hold the primary button', async ({ page }) => {
      await page.goto(`/components/overlay/modal${fw.query}`);
      const opener = page.getByRole('button', { name: 'Delete project…' });
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const dialog = page.getByRole('alertdialog', { name: 'Delete project?' });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('.oge-dialog-details li')).toHaveCount(3);
      const ok = dialog.getByRole('button', { name: 'Delete project' });
      await expect(ok).toHaveAttribute('aria-disabled', 'true');
      const field = dialog.getByLabel('Type acme-web to confirm');
      await expect(field).toBeFocused();
      await field.fill('acme-web');
      await expect(ok).toHaveAttribute('aria-disabled', 'true');
      await dialog.getByLabel('I understand this cannot be undone').check();
      await expect(ok).not.toHaveAttribute('aria-disabled', 'true');
      await ok.click();
      await expect(page.getByTestId('gates-result').first()).toHaveText(
        'result: confirm → true',
      );
    });

    test('a locked modal says why it stays open', async ({ page }) => {
      await page.goto(`/components/overlay/modal${fw.query}`);
      const opener = page.getByRole('button', { name: 'Open with a lock' });
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Order details' });
      await expect(dialog).toBeFocused();
      await dialog.getByLabel('Lock for 2 seconds (busy)').check();
      await page.keyboard.press('Escape');
      await expect(dialog.getByTestId('blocked-why')).toHaveText(
        'Close blocked by: busy',
      );
      // the lock lifts by itself; then Escape closes
      await expect(dialog).not.toHaveAttribute('aria-busy', 'true', {
        timeout: 5000,
      });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });

    test('tree drag rules: the locked folder stays, drops go inside', async ({
      page,
    }) => {
      await page.goto(`/components/tree-view${fw.query}`);
      const tree = page.locator('.demo-tree-rules').first();
      await tree.scrollIntoViewIfNeeded();
      const row = (name: string) =>
        tree.locator('.oge-tree-view-item', { hasText: name }).first();
      // System is locked: dragging it does nothing
      await row('System').dragTo(row('Shared'));
      await expect(row('config.json')).toBeVisible();
      // Shared lands inside Projects, even dropped on its top edge
      const target = await row('Projects').boundingBox();
      await row('Shared').dragTo(row('Projects'), {
        targetPosition: { x: 20, y: 2 },
      });
      expect(target).not.toBeNull();
      await expect(
        tree.locator('.oge-tree-view-item[aria-level="2"]', {
          hasText: 'Shared',
        }),
      ).toHaveCount(1);
    });
  });
}
