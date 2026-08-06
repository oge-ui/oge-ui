import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('buttons overview', () => {
  test('renders every variant and toggles dark mode', async ({ page }) => {
    await page.goto('/components/buttons');
    await expect(page.locator('.oge-button').first()).toBeVisible();
    await expect(
      page.locator('.oge-button-severity-danger').first(),
    ).toBeVisible();
    await expect(page.locator('.oge-button-badge').first()).toBeVisible();
    // 100 → capped pill
    await expect(
      page.locator('.oge-button-badge', { hasText: '99+' }),
    ).toBeVisible();
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    await page.goto('/components/buttons');
    await expect(page.locator('.oge-button').first()).toBeVisible();
    const scan = () =>
      new AxeBuilder({ page })
        .include('.oge-button')
        .disableRules(['color-contrast'])
        .analyze();
    let results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('button interactions', () => {
  test('async action shows the spinner and blocks re-clicks (single-flight)', async ({
    page,
  }) => {
    await page.goto('/components/buttons/interactions');
    const save = page.locator('.oge-button-native', {
      hasText: 'Save changes',
    });
    await save.click();
    await expect(page.locator('.oge-button-spinner')).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(page.getByText('saved ×1')).toBeVisible({ timeout: 5000 });
  });

  test('hold-to-confirm ignores quick taps and fires after a real hold', async ({
    page,
  }) => {
    await page.goto('/components/buttons/interactions');
    const hold = page.locator('.oge-button-native', {
      hasText: 'Delete account',
    });

    await hold.click(); // quick tap: nothing
    await expect(page.getByText('confirmed ×0')).toBeVisible();

    await hold.scrollIntoViewIfNeeded();
    const box = await hold.boundingBox();
    if (!box) throw new Error('hold button not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1400); // ms: 1200 + margin
    await page.mouse.up();
    await expect(page.getByText('confirmed ×1')).toBeVisible();
  });

  test('autoRepeat keeps counting while held', async ({ page }) => {
    await page.goto('/components/buttons/interactions');
    const plus = page.getByTestId('repeat-plus').locator('.oge-button-native');
    await plus.scrollIntoViewIfNeeded();
    const box = await plus.boundingBox();
    if (!box) throw new Error('repeat button not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1000); // 1 immediate + repeats after 400ms delay
    await page.mouse.up();
    const value = Number(await page.getByTestId('repeat-value').textContent());
    expect(value).toBeGreaterThan(2);
  });
});

test.describe('button group', () => {
  test('single mode selects by click and by arrow key (radio pattern)', async ({
    page,
  }) => {
    await page.goto('/components/buttons/button-group');
    const group = page.locator('.oge-button-group').first();
    await expect(group).toHaveAttribute('role', 'radiogroup');

    await group.locator('.oge-button-native', { hasText: 'Center' }).click();
    await expect(page.getByText('selected: center')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('selected: right')).toBeVisible();
    await expect(
      group.locator('.oge-button-native', { hasText: 'Right' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('multiple mode toggles with aria-pressed', async ({ page }) => {
    await page.goto('/components/buttons/button-group');
    const bold = page.locator('.oge-button-native', { hasText: 'B' }).first();
    await expect(bold).toHaveAttribute('aria-pressed', 'true'); // preset
    await bold.click();
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
  });

  test('group pages have no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/components/buttons/button-group');
    await expect(page.locator('.oge-button-group').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.oge-button-group')
      .disableRules(['color-contrast'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});

test.describe('drop down button', () => {
  test('opens below the trigger, item click selects and closes', async ({
    page,
  }) => {
    await page.goto('/components/buttons/drop-down-button');
    const trigger = page
      .locator('.oge-drop-down-button .oge-button-native')
      .first();
    // align the trigger near the viewport top so the panel has room below
    await trigger.evaluate((el) =>
      el.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await trigger.click();
    const popup = page.locator('.oge-popup');
    await expect(popup).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    const popupBox = await popup.boundingBox();
    expect(popupBox && triggerBox && popupBox.y > triggerBox.y).toBe(true);

    await page.locator('.oge-menu-item', { hasText: 'CSV' }).click();
    await expect(popup).not.toBeVisible();
    await expect(page.getByText('selected: CSV')).toBeVisible();
  });

  test('outside click closes; Escape closes and restores trigger focus', async ({
    page,
  }) => {
    await page.goto('/components/buttons/drop-down-button');
    const trigger = page
      .locator('.oge-drop-down-button .oge-button-native')
      .first();
    await trigger.click();
    await expect(page.locator('.oge-popup')).toBeVisible();
    await page.locator('h1').click(); // outside
    await expect(page.locator('.oge-popup')).not.toBeVisible();

    await trigger.click();
    await expect(page.locator('.oge-popup')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.oge-popup')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('ArrowDown opens with the first item active; type-ahead jumps', async ({
    page,
  }) => {
    await page.goto('/components/buttons/drop-down-button');
    const trigger = page
      .locator('.oge-drop-down-button .oge-button-native')
      .first();
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.locator('.oge-menu-list');
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-activedescendant', /-item-0$/);

    await page.keyboard.press('p'); // "PDF"
    await expect(menu).toHaveAttribute('aria-activedescendant', /-item-3$/);
    await page.keyboard.press('Enter');
    await expect(page.locator('.oge-popup')).not.toBeVisible();
    await expect(page.getByText('selected: PDF')).toBeVisible();
  });

  test('split: main fires without opening, remembered item relabels it', async ({
    page,
  }) => {
    await page.goto('/components/buttons/drop-down-button');
    const demo = page.getByTestId('split-demo');
    const main = demo.locator('.oge-button-native').first();
    const chevron = demo.locator('.oge-drop-down-toggle .oge-button-native');

    await main.click();
    await expect(page.getByText('runs ×1')).toBeVisible();
    await expect(page.locator('.oge-popup')).not.toBeVisible();

    await chevron.click();
    await page.locator('.oge-menu-item', { hasText: 'Run build' }).click();
    await expect(main).toContainText('Run build');
    await expect(page.getByText('last: Run build')).toBeVisible();

    await main.click(); // re-dispatches the remembered item
    await expect(page.getByText('runs ×2')).toBeVisible();
  });

  test('async items show the loading row, then cache', async ({ page }) => {
    await page.goto('/components/buttons/drop-down-button');
    const demo = page.getByTestId('async-demo');
    const trigger = demo.locator('.oge-button-native');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.locator('.oge-menu-status-row')).toBeVisible();
    await expect(
      page.locator('.oge-menu-item', { hasText: 'develop' }),
    ).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await trigger.click(); // cached: items render immediately, no loading row
    await expect(
      page.locator('.oge-menu-item', { hasText: 'develop' }),
    ).toBeVisible();
  });

  test('open menu has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    await page.goto('/components/buttons/drop-down-button');
    const trigger = page
      .locator('.oge-drop-down-button .oge-button-native')
      .first();
    await trigger.click();
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    const scan = () =>
      new AxeBuilder({ page })
        .include('.oge-drop-down-button')
        .include('.oge-popup')
        .disableRules(['color-contrast'])
        .analyze();
    let results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press('Escape');
    await page.getByLabel('Switch to dark mode').click();
    await trigger.click();
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
