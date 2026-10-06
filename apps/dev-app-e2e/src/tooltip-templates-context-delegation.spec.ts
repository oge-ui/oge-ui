import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Tooltip templates (rich content, arrow, show modes) and context-menu
 * delegation (selector target, per-target items through the cancelable
 * opening event, imperative open) in both render layers.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

/**
 * Right-click through raw coordinates: Playwright's click actionability
 * re-scrolls the target under the sticky header (see overlay.spec.ts).
 */
async function rightClick(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('target has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
}

for (const layer of LAYERS) {
  const go = (page: Page) =>
    page.goto(`/components/overlay/tooltip-context-menu${layer.query}`);

  test.describe(`tooltip templates (${layer.name})`, () => {
    test('rich content with an arrow describes the trigger', async ({
      page,
    }) => {
      await go(page);
      const trigger = page
        .getByTestId('tooltip-templates')
        .getByRole('button', { name: 'Ada Lovelace' });
      await trigger.focus();
      const bubble = page.locator('.oge-tooltip', { hasText: 'Engineer' });
      await expect(bubble).toBeVisible();
      await expect(bubble.locator('strong')).toHaveText('Ada Lovelace');
      await expect(bubble.locator('.oge-tooltip-arrow')).toBeVisible();
      await expect(bubble.locator('.oge-tooltip-arrow')).toHaveAttribute(
        'data-side',
        'top',
      );
      const id = await bubble.getAttribute('id');
      await expect(trigger).toHaveAttribute(
        'aria-describedby',
        new RegExp(id ?? '__none__'),
      );
      await page.keyboard.press('Escape');
      await expect(bubble).toBeHidden();
    });

    test("showMode 'click' toggles; 'manual' follows code", async ({
      page,
    }) => {
      await go(page);
      const demo = page.getByTestId('tooltip-templates');
      const clickMe = demo.getByRole('button', { name: 'Click me' });
      await clickMe.hover();
      await page.waitForTimeout(600); // past the hover dwell
      const toggled = page.locator('.oge-tooltip', {
        hasText: 'Toggled by clicking',
      });
      await expect(toggled).toBeHidden();
      await clickMe.click();
      await expect(toggled).toBeVisible();
      await clickMe.click();
      await expect(toggled).toBeHidden();

      const copy = demo.getByRole('button', { name: 'Copy' });
      await copy.focus();
      const copied = page.locator('.oge-tooltip', { hasText: 'Copied!' });
      await expect(copied).toBeHidden();
      await copy.click();
      await expect(copied).toBeVisible();
    });
  });

  test.describe(`context menu delegation (${layer.name})`, () => {
    test('one menu serves every row with items built per target', async ({
      page,
    }) => {
      await go(page);
      const demo = page.getByTestId('context-delegation');
      const row = demo.locator('li', { hasText: 'budget.xlsx' });
      await rightClick(page, row);
      const menu = page.getByRole('menu', { name: 'File actions' });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText('Open budget.xlsx');
      // the locked row's destructive item is disabled
      await expect(
        menu.getByRole('menuitem', { name: 'Delete' }),
      ).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(row).toBeFocused();

      await rightClick(page, demo.locator('li', { hasText: 'notes.md' }));
      await expect(menu).toContainText('Open notes.md');
      await menu.getByRole('menuitem', { name: 'Rename' }).click();
      await expect(menu).toHaveCount(0);
      await expect(page.getByTestId('delegation-last')).toContainText('Rename');
    });

    test('Shift+F10 on a focused row and open(x, y) from code', async ({
      page,
    }) => {
      await go(page);
      const demo = page.getByTestId('context-delegation');
      const row = demo.locator('li', { hasText: 'notes.md' });
      await row.scrollIntoViewIfNeeded();
      await row.focus();
      await page.keyboard.press('Shift+F10');
      const menu = page.getByRole('menu', { name: 'File actions' });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText('Open notes.md');
      await page.keyboard.press('Escape');
      await expect(row).toBeFocused();

      await demo
        .getByRole('button', { name: 'Open menu at the first row' })
        .click();
      await expect(menu).toBeVisible();
      await expect(menu).toContainText('Open report.xlsx');
    });
  });
}
