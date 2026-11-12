import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

/** The React view is the same route with `?framework=react`. */
for (const view of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
]) {
  test.describe(`File manager (${view.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/upload/file-manager${view.query}`);
      await expect(page.locator('.oge-fm-item').first()).toBeVisible();
    });

    const items = (
      fm: ReturnType<import('@playwright/test').Page['locator']>,
    ) => fm.locator('.oge-fm-item .oge-fm-name > span:last-child');

    test('opens folders from the list and the tree, and walks back', async ({
      page,
    }) => {
      const fm = page.locator('.oge-fm').first();
      await expect(items(fm)).toHaveText([
        'Finance',
        'Photos',
        'Projects',
        'Employee handbook.pdf',
        'Read me.txt',
      ]);
      await fm.locator('.oge-fm-item', { hasText: 'Projects' }).dblclick();
      await expect(items(fm)).toHaveText(['Apollo', 'Hermes']);
      await expect(
        fm.locator('.oge-fm-path [aria-current="location"]'),
      ).toHaveText('Projects');
      await fm.getByRole('treeitem', { name: 'Apollo' }).click();
      await expect(items(fm)).toHaveText(['Plan.xlsx', 'Specification.docx']);
      await fm.getByRole('button', { name: 'Back' }).click();
      await expect(items(fm)).toHaveText(['Apollo', 'Hermes']);
      await fm.locator('.oge-fm-item', { hasText: 'Apollo' }).dblclick();
      await fm.locator('.oge-fm-item', { hasText: 'Plan.xlsx' }).dblclick();
      await expect(page.getByText('Opened: Plan.xlsx')).toBeVisible();
    });

    test('works from the keyboard: arrows, Enter, F2 rename, Backspace', async ({
      page,
    }) => {
      const fm = page.locator('.oge-fm').first();
      const list = fm.getByRole('listbox');
      await list.focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowDown');
      await expect(fm.locator('.oge-fm-item[aria-selected="true"]')).toHaveText(
        /Photos/,
      );
      await page.keyboard.press('Enter');
      await expect(items(fm)).toHaveText(['Offsite.jpg', 'Team.png']);
      await list.focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('F2');
      const rename = fm.getByRole('textbox', { name: 'New name' });
      await expect(rename).toBeFocused();
      await rename.fill('Retreat.jpg');
      await page.keyboard.press('Enter');
      await expect(items(fm)).toHaveText(['Retreat.jpg', 'Team.png']);
      await list.focus();
      await page.keyboard.press('Backspace');
      await expect(items(fm).first()).toHaveText('Finance');
    });

    test('moves an item by dragging it onto a folder', async ({ page }) => {
      const fm = page.locator('.oge-fm').first();
      // HTML5 drag and drop through one shared DataTransfer: Playwright's
      // dragTo does not fire it in WebKit
      const transfer = await page.evaluateHandle(() => new DataTransfer());
      const source = fm.locator('.oge-fm-item', { hasText: 'Read me.txt' });
      const target = fm.locator('.oge-fm-item', { hasText: 'Finance' });
      await source.dispatchEvent('dragstart', { dataTransfer: transfer });
      await target.dispatchEvent('dragover', { dataTransfer: transfer });
      await target.dispatchEvent('drop', { dataTransfer: transfer });
      await expect(items(fm)).not.toContainText(['Read me.txt']);
      await expect(fm.locator('.oge-fm-status [role="status"]')).toHaveText(
        '1 item moved',
      );
      await fm.locator('.oge-fm-item', { hasText: 'Finance' }).dblclick();
      await expect(items(fm)).toContainText(['Read me.txt']);
    });

    test('creates a folder and deletes it from the context menu', async ({
      page,
    }) => {
      const fm = page.locator('.oge-fm').first();
      await fm.getByRole('button', { name: 'New folder' }).click();
      const rename = fm.getByRole('textbox', { name: 'New name' });
      await rename.fill('Drafts');
      await page.keyboard.press('Enter');
      await expect(items(fm)).toContainText(['Drafts']);
      await fm
        .locator('.oge-fm-item', { hasText: 'Drafts' })
        .click({ button: 'right' });
      // the docs sidebar can cover a menu opened near the bottom: activate
      // the item directly
      await page
        .getByRole('menuitem', { name: 'Delete' })
        .dispatchEvent('click');
      await expect(items(fm)).not.toContainText(['Drafts']);
    });

    test('the read-only demo hides the write commands', async ({ page }) => {
      const fm = page.locator('.oge-fm').nth(1);
      await expect(fm.getByRole('button', { name: 'New folder' })).toHaveCount(
        0,
      );
      await expect(fm.getByRole('button', { name: 'Delete' })).toHaveCount(0);
      await expect(fm.locator('.oge-fm-items')).toHaveClass(/oge-fm-grid/);
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include('.oge-fm')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
