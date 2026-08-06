import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Playwright's click actionability re-scrolls the target under the sticky
 * header and then reports it as intercepted — right-click through raw
 * coordinates instead (the element is probe-verified visible and on top).
 */
async function rightClick(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('context target has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
}

test.describe('tooltip', () => {
  test('shows on hover after the dwell, hides on leave', async ({ page }) => {
    await page.goto('/components/overlay/tooltip-context-menu');
    const trigger = page.locator('.oge-button-native', { hasText: 'Save' });
    await trigger.hover();
    const tooltip = page.locator('.oge-tooltip', {
      hasText: 'Saves your changes',
    });
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute('role', 'tooltip');

    // aria-describedby wires the trigger to the visible bubble
    const tooltipId = await tooltip.getAttribute('id');
    await expect(trigger).toHaveAttribute(
      'aria-describedby',
      new RegExp(tooltipId ?? '__missing__'),
    );

    await page.locator('h1').hover();
    await expect(tooltip).toBeHidden();
  });

  test('shows immediately on keyboard focus and hides on Escape', async ({
    page,
  }) => {
    await page.goto('/components/overlay/tooltip-context-menu');
    const trigger = page.locator('.oge-button-native', { hasText: 'Save' });
    await trigger.focus();
    const tooltip = page.locator('.oge-tooltip', {
      hasText: 'Saves your changes',
    });
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
  });
});

test.describe('context menu', () => {
  test('right-click opens at the pointer; item click selects and closes', async ({
    page,
  }) => {
    await page.goto('/components/overlay/tooltip-context-menu');
    const target = page.getByTestId('context-target');
    await rightClick(page, target);
    const menu = page.locator('.oge-menu-list');
    await expect(menu).toBeVisible();

    await page.locator('.oge-menu-item', { hasText: 'Duplicate' }).click();
    await expect(menu).toBeHidden();
  });

  test('Escape closes and outside click closes', async ({ page }) => {
    await page.goto('/components/overlay/tooltip-context-menu');
    const target = page.getByTestId('context-target');
    await rightClick(page, target);
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.oge-menu-list')).toBeHidden();

    await rightClick(page, target);
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    // outside click: just above the target, left corner — clear of the menu
    const box = await target.boundingBox();
    if (!box) throw new Error('context target has no bounding box');
    await page.mouse.click(box.x + 8, box.y - 30);
    await expect(page.locator('.oge-menu-list')).toBeHidden();
  });

  test('keyboard: Shift+F10 opens focused on the first item, arrows navigate', async ({
    page,
  }) => {
    await page.goto('/components/overlay/tooltip-context-menu');
    const target = page.getByTestId('context-target');
    await target.scrollIntoViewIfNeeded();
    await target.focus();
    await page.keyboard.press('Shift+F10');
    const menu = page.locator('.oge-menu-list').first();
    await expect(menu).toBeVisible();
    await expect(menu).toBeFocused();
    await expect(
      page.locator('.oge-menu-item-active', { hasText: 'Open' }),
    ).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.locator('.oge-menu-item-active', { hasText: 'Duplicate' }),
    ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(target).toBeFocused();
  });
});

test.describe('overlay accessibility', () => {
  test('has no axe violations with an open context menu', async ({ page }) => {
    test.slow();
    await page.goto('/components/overlay/tooltip-context-menu');
    const target = page.getByTestId('context-target');
    await rightClick(page, target);
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.oge-popup')
      .include('[data-testid="context-target"]')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
