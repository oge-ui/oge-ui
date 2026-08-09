import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Modality is the whole point of this component, and it is the part jsdom
 * cannot prove end to end: it needs real layout, real focus and a real
 * backdrop. The mode decision itself is unit-tested DOM-free in `@oge-ui/core`.
 */
test('a modal drawer is a dialog; a side drawer is a landmark', async ({
  page,
}) => {
  await page.goto('/components/drawer');

  const modal = page.locator('app-demo-card:has(#modal-drawer) oge-drawer');
  const panel = modal.locator('.oge-drawer-panel');
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'true');

  const rail = page.locator('app-demo-card:has(#compact-rail) oge-drawer');
  const railPanel = rail.locator('.oge-drawer-panel');
  // a persistent drawer must be a landmark, and must NOT claim aria-modal
  await expect(railPanel).toHaveAttribute('role', 'navigation');
  await expect(railPanel).not.toHaveAttribute('aria-modal', /.*/);
});

test('opening a modal drawer takes focus and Escape gives it back', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const card = page.locator('app-demo-card:has(#modal-drawer)');
  const opener = card.getByRole('button', { name: 'Open menu' });

  await opener.scrollIntoViewIfNeeded();
  await opener.click();

  const panel = card.locator('.oge-drawer-panel');
  await expect(panel).not.toHaveAttribute('inert', /.*/);
  // autoFocus 'first-tabbable' lands on the close button, which this demo
  // renders ahead of the panel content
  await expect(panel.locator('.oge-drawer-close')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();
});

test('the container width, not the window, drives the compact downgrade', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const card = page.locator('app-demo-card:has(#responsive-downgrade)');
  const slider = card.locator('input[type="range"]');
  const drawer = card.locator('oge-drawer');

  await slider.scrollIntoViewIfNeeded();
  await slider.fill('700');
  await expect(drawer).toHaveAttribute('data-mode', 'side');

  // the browser window never changes — only the box the drawer lives in
  await slider.fill('300');
  await expect(drawer).toHaveAttribute('data-mode', 'overlay');
  await expect(card.locator('p').last()).toContainText('overlay');

  await slider.fill('700');
  await expect(drawer).toHaveAttribute('data-mode', 'side');
});

test('the app shell renders toolbar, drawer, tree view and splitter together', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const shell = page.locator('app-demo-card:has(#app-shell)');
  await expect(shell.locator('oge-toolbar')).toHaveAttribute('role', 'toolbar');
  await expect(shell.locator('oge-drawer .oge-tree-view')).toBeVisible();
  await expect(shell.locator('oge-splitter')).toBeVisible();
});

test('drawer page has no axe violations (light and dark)', async ({ page }) => {
  await page.goto('/components/drawer');
  // the route is lazy: wait for a real drawer before handing axe an include
  await expect(page.locator('oge-drawer').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-drawer')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
