import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Overflow is the one part of the toolbar jsdom cannot prove: it needs real
 * layout. The fitting arithmetic is unit-tested in `@oge-ui/core`; these
 * tests check that a real browser feeds it real measurements.
 */
test('narrowing the container collapses commands into the overflow menu', async ({
  page,
}) => {
  await page.goto('/components/toolbar');
  // scoped by the heading anchor id — several cards mention "overflow menu"
  const card = page.locator('app-demo-card:has(#overflow-menu)');
  const toolbar = card.locator('oge-toolbar');
  const slider = card.locator('input[type="range"]');

  await slider.scrollIntoViewIfNeeded();
  // wide: only the explicitly pinned item lives in the menu
  await slider.fill('720');
  await expect(
    card.locator('p', { hasText: 'in the menu → 1 command' }),
  ).toBeVisible();
  const wideCount = await toolbar.locator('.oge-toolbar-item').count();

  await slider.fill('260');
  await expect
    .poll(async () => toolbar.locator('.oge-toolbar-item').count())
    .toBeLessThan(wideCount);
  await expect(
    card.locator('p', { hasText: /in the menu → [2-9] command/ }),
  ).toBeVisible();

  // the pinned 'never' item is still on the bar
  await expect(toolbar.getByRole('button', { name: 'Cut' })).toBeVisible();

  // and the menu opens with the collapsed commands
  await toolbar.locator('.oge-toolbar-menu-btn').click();
  const menu = page.locator('.oge-menu-list');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Document settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

test('the toolbar is one Tab stop and arrow keys move between commands', async ({
  page,
}) => {
  await page.goto('/components/toolbar');
  const toolbar = page
    .locator('app-demo-card:has(#commands)')
    .locator('oge-toolbar')
    .first();
  await expect(toolbar).toHaveAttribute('role', 'toolbar');

  const first = toolbar.getByRole('button', { name: 'New' });
  await first.focus();
  await expect(first).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(toolbar.getByRole('button', { name: 'Open' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(toolbar.getByRole('button', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();

  // exactly one control carries tabindex="0"
  await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
});

test('the grid renders its command bar as the shared toolbar', async ({
  page,
}) => {
  await page.goto('/components/data-grid');
  const toolbar = page.locator('.oge-grid oge-toolbar').first();
  await expect(toolbar).toHaveAttribute('role', 'toolbar');
  await expect(toolbar).toHaveAttribute('aria-label', 'Grid toolbar');
});

test('toolbar page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/toolbar');
  await expect(page.locator('oge-toolbar').first()).toBeVisible();

  const scan = async () =>
    (
      await new AxeBuilder({ page })
        .include('oge-toolbar')
        .disableRules(['color-contrast'])
        .analyze()
    ).violations.map((v) => v.id);

  expect(await scan()).toEqual([]);
  await page
    .locator('body')
    .evaluate((el) => el.classList.add('oge-theme-dark'));
  expect(await scan()).toEqual([]);
});
