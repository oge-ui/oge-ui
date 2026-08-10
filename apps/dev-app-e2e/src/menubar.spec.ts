import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The menubar has a real APG pattern, so what e2e must prove is the pattern
 * itself in a real DOM — roving tabindex, submenu open/close per level, the
 * leaf-ArrowRight bar hop — plus the hamburger collapse and a clean axe run.
 * jsdom cannot verify real focus traversal across anchored panels; this can.
 */

const DEMO = 'app-demo-card:has(#getting-started)';

test('renders the APG role contract with one roving tab stop', async ({
  page,
}) => {
  await page.goto('/components/menubar');
  const bar = page.locator(`${DEMO} [role="menubar"]`).first();
  await expect(bar).toBeVisible();

  const items = bar.locator('[role="menuitem"]');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toHaveAttribute('tabindex', '0');
  await expect(items.nth(1)).toHaveAttribute('tabindex', '-1');
  await expect(items.nth(0)).toHaveAttribute('aria-haspopup', 'menu');
  await expect(items.nth(0)).toHaveAttribute('aria-expanded', 'false');
});

test('walks the full APG keyboard contract in a real DOM', async ({ page }) => {
  await page.goto('/components/menubar');
  const bar = page.locator(`${DEMO} [role="menubar"]`).first();
  const items = bar.locator('[role="menuitem"]');
  await items.first().scrollIntoViewIfNeeded();

  // Arrow between items, wrapping.
  await items.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(items.nth(2)).toBeFocused(); // wrapped backwards to Help
  await page.keyboard.press('Home');
  await expect(items.nth(0)).toBeFocused();

  // Down opens the File menu with the first item active; real focus moves in.
  await page.keyboard.press('ArrowDown');
  const menu = page.locator('.oge-menu-list').first();
  await expect(menu).toBeVisible();
  await expect(items.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeFocused();

  // ArrowRight on the nested parent (Share) opens the nested submenu.
  await page.keyboard.press('ArrowDown'); // Open…
  await page.keyboard.press('ArrowDown'); // Share (separator skipped)
  await page.keyboard.press('ArrowRight');
  const lists = page.locator('.oge-menu-list');
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(1)).toBeFocused();

  // Escape unwinds one level at a time, focus returning to the opener.
  await page.keyboard.press('Escape');
  await expect(lists).toHaveCount(1);
  await expect(lists.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(lists).toHaveCount(0);
  await expect(items.nth(0)).toBeFocused();
  await expect(items.nth(0)).toHaveAttribute('aria-expanded', 'false');

  // With a menu open, ArrowRight on a leaf hops to the next bar item's menu.
  await page.keyboard.press('ArrowDown'); // reopen File, New active
  // Focus moves into the list asynchronously (after the panel measures) —
  // wait for it, or under load the next key would land on the bar item.
  await expect(page.locator('.oge-menu-list').first()).toBeFocused();
  await page.keyboard.press('ArrowRight'); // leaf → Edit menu opens focused
  await expect(items.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.oge-menu-list').first()).toBeFocused();

  // Selecting a leaf closes everything and reports the click.
  await page.keyboard.press('Enter'); // Undo
  await expect(page.locator('.oge-menu-list')).toHaveCount(0);
  await expect(page.locator('[data-testid="menubar-log"]')).toContainText(
    'undo',
  );
});

test('the squeezed bar collapses into a hamburger opening the full tree', async ({
  page,
}) => {
  await page.goto('/components/menubar');
  const demo = page.locator('app-demo-card:has(#adaptive-hamburger)');
  await demo.scrollIntoViewIfNeeded();

  await demo.locator('input[type="range"]').fill('240');
  const hamburger = demo.locator('.oge-menubar-hamburger');
  await expect(hamburger).toBeVisible();
  await expect(demo.locator('[role="menubar"]')).toHaveCount(0);

  await hamburger.click();
  const menu = page.locator('.oge-menu-list').first();
  await expect(menu).toBeVisible();
  // The childful root renders as a submenu parent inside the tree.
  await expect(
    menu.locator('.oge-menu-item[aria-haspopup="menu"]').first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.oge-menu-list')).toHaveCount(0);

  // Widening restores the bar.
  await demo.locator('input[type="range"]').fill('640');
  await expect(demo.locator('[role="menubar"]')).toBeVisible();
});

test('menubar page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/menubar');
  await expect(page.locator('oge-menubar').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-menubar')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});

test('an open submenu passes axe too', async ({ page }) => {
  await page.goto('/components/menubar');
  const bar = page.locator(`${DEMO} [role="menubar"]`).first();
  await bar.locator('[role="menuitem"]').first().click();
  await expect(page.locator('.oge-menu-list').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-popup')
    .disableRules(['color-contrast'])
    .analyze();
  expect(results.violations).toEqual([]);
});
