import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Windows High Contrast (forced colors) drops every `box-shadow`, which is
 * what the house focus ring is drawn with — the transparent outline from
 * `tokens.focus-ring` is what survives there. These checks emulate forced
 * colors and guard that ring plus the system-colour selection.
 */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
});

/**
 * Reaches `target` by keyboard (focus it, step out with Shift+Tab, come back
 * with Tab) so `:focus-visible` matches, then reads the outline `ring` draws.
 */
async function expectKeyboardRing(
  page: Page,
  target: Locator,
  ring: Locator = target,
): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
  const outline = await ring.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
    };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
}

/** Resolves a CSS system colour keyword to the rgb() the page paints it as. */
async function systemColor(page: Page, keyword: string): Promise<string> {
  return page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = color;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, keyword);
}

test('data grid: the focused cell keeps a visible ring, selection paints Highlight', async ({
  page,
}) => {
  await page.goto('/components/data-grid/selection');
  const grid = page.locator('oge-grid').first();
  await expect(grid.locator('.oge-row').first()).toBeVisible();

  // a grid is one tab stop with arrow-key cell navigation: enter it, move
  // one cell by keyboard, and read the ring on whatever cell holds focus
  const cell = grid.locator('.oge-row .oge-cell[tabindex="0"]').first();
  await cell.scrollIntoViewIfNeeded();
  await cell.focus();
  await page.keyboard.press('ArrowDown');
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    return {
      isCell: el.classList.contains('oge-cell'),
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
    };
  });
  expect(ring.isCell).toBe(true);
  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);

  await grid.locator('.oge-cell.oge-checkbox-cell input').nth(1).click();
  const selected = grid.locator('.oge-row-selected').first();
  await expect(selected).toBeVisible();
  const background = (row: Locator) =>
    row
      .locator('.oge-cell')
      .last()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  const selectedBg = await background(selected);
  const plainBg = await background(
    grid.locator('.oge-row:not(.oge-row-selected)').nth(3),
  );
  expect(selectedBg).toBe(await systemColor(page, 'Highlight'));
  expect(selectedBg).not.toBe(plainBg);
});

test('select box: the input keeps a visible keyboard ring', async ({
  page,
}) => {
  await page.goto('/components/inputs/select-box');
  const input = page.locator('oge-select-box .oge-input-native').first();
  await expectKeyboardRing(page, input);
});

test('switch and check box: keyboard focus stays visible', async ({ page }) => {
  await page.goto('/components/inputs/toggle-controls');
  await expectKeyboardRing(
    page,
    page.locator('oge-switch .oge-switch-button').first(),
  );
  const checkBox = page.locator('oge-check-box').first();
  // the native input is invisible; the ring is drawn on the glyph next to it
  await expectKeyboardRing(
    page,
    checkBox.locator('.oge-check-box-input'),
    checkBox.locator('.oge-check-box-icon'),
  );
});

test('switch: the on state is not carried by colour alone', async ({
  page,
}) => {
  await page.goto('/components/inputs/toggle-controls');
  const on = page.locator('oge-switch.oge-switch-on').first();
  await expect(on).toBeVisible();
  const track = await on
    .locator('.oge-switch-track')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(track).toBe(await systemColor(page, 'Highlight'));
});

test('tabs: the selected tab keeps a visible keyboard ring', async ({
  page,
}) => {
  await page.goto('/components/tabs');
  const tab = page.locator('.oge-tab.oge-tab-selected').first();
  await expect(tab).toBeVisible();
  await expectKeyboardRing(page, tab);
});

test('buttons: keyboard focus stays visible, contained buttons keep a frame', async ({
  page,
}) => {
  await page.goto('/components/buttons');
  const button = page.locator('oge-button .oge-button-native').first();
  await expect(button).toBeVisible();
  await expectKeyboardRing(page, button);

  const contained = page
    .locator(
      '.oge-button-colored:not(.oge-button-outlined):not(.oge-button-text-mode) .oge-button-native',
    )
    .first();
  const border = await contained.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      width: parseFloat(style.borderTopWidth),
      color: style.borderTopColor,
    };
  });
  expect(border.width).toBeGreaterThanOrEqual(1);
  expect(border.color).not.toBe('rgba(0, 0, 0, 0)');
});
