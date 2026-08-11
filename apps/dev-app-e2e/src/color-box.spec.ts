import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * jsdom cannot lay out the gradient surface or deliver a real drag — this
 * suite proves the panel opens with real DOM focus, the 2D pointer math
 * against real geometry, the hue keyboard step, the palette grid walk and a
 * clean axe run of the OPEN panel in both themes.
 */

const BASIC = 'app-demo-card:has(#getting-started)';
const PALETTE = 'app-demo-card:has(#palette-view)';
const BUTTONS = 'app-demo-card:has(#apply-with-buttons)';

test('opening moves DOM focus to the surface; Escape restores the input', async ({
  page,
}) => {
  await page.goto('/components/inputs/color-box');
  const input = page.locator(`${BASIC} .oge-input-native`);
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await page.keyboard.press('ArrowDown');
  const thumb = page.locator('.oge-color-surface-thumb');
  await expect(thumb).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.oge-color-box-panel')).toHaveCount(0);
  await expect(input).toBeFocused();
});

test('dragging the gradient surface commits a new value live', async ({
  page,
}) => {
  await page.goto('/components/inputs/color-box');
  const value = page.locator('[data-testid="color-value"]');
  const before = await value.textContent();
  await page.locator(`${BASIC} .oge-input-dropdown`).click();
  const surface = page.locator('.oge-color-surface');
  await expect(surface).toBeVisible();
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.6, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(value).not.toHaveText(before!);
});

test('hue slider steps by keyStep on the APG keyboard contract', async ({
  page,
}) => {
  await page.goto('/components/inputs/color-box');
  await page.locator(`${BASIC} .oge-input-dropdown`).click();
  const hue = page.locator(
    '.oge-color-slider:not(.oge-color-slider-alpha) .oge-color-slider-thumb',
  );
  await expect(hue).toBeVisible();
  await hue.focus();
  await page.keyboard.press('Home'); // pin a known start — the seed hue is fractional
  await expect(hue).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('ArrowRight');
  await expect(hue).toHaveAttribute('aria-valuenow', '5');
  await page.keyboard.press('PageUp');
  await expect(hue).toHaveAttribute('aria-valuenow', '30');
  await expect(hue).toHaveAttribute('aria-valuetext', '30 degrees');
  await page.keyboard.press('End');
  await expect(hue).toHaveAttribute('aria-valuenow', '360');
});

test('palette grid walks with arrows and Enter picks + closes', async ({
  page,
}) => {
  await page.goto('/components/inputs/color-box');
  const input = page.locator(`${PALETTE} .oge-input-native`);
  await input.scrollIntoViewIfNeeded();
  await page.locator(`${PALETTE} .oge-input-dropdown`).click();
  const grid = page.locator('.oge-color-palette');
  await expect(grid).toHaveAttribute('role', 'grid');
  const active = page.locator('.oge-color-palette-cell[tabindex="0"]');
  await expect(active).toBeFocused(); // focus target in palette view
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const focused = page.locator('.oge-color-palette-cell:focus');
  const picked = await focused.getAttribute('aria-label');
  await page.keyboard.press('Enter');
  await expect(page.locator('.oge-color-box-panel')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(picked!);
});

test('useButtons drafts until OK and discards on Cancel', async ({ page }) => {
  await page.goto('/components/inputs/color-box');
  const input = page.locator(`${BUTTONS} .oge-input-native`);
  await input.scrollIntoViewIfNeeded();
  const before = await input.inputValue();
  await page.locator(`${BUTTONS} .oge-input-dropdown`).click();
  const hue = page.locator(
    '.oge-color-slider:not(.oge-color-slider-alpha) .oge-color-slider-thumb',
  );
  await hue.focus();
  await page.keyboard.press('PageUp');
  await expect(input).toHaveValue(before); // drafted only
  await page.locator('.oge-color-box-action:not(.oge-color-box-ok)').click();
  await expect(input).toHaveValue(before); // cancelled

  await page.locator(`${BUTTONS} .oge-input-dropdown`).click();
  await hue.focus();
  await page.keyboard.press('PageUp');
  await page.locator('.oge-color-box-ok').click();
  await expect(input).not.toHaveValue(before);
});

test('color box page has no axe violations with the panel open (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/inputs/color-box');
  await page.locator(`${BASIC} .oge-input-dropdown`).click();
  await expect(page.locator('.oge-color-box-panel')).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-color-box')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
