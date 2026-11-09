import { test, expect, type Locator, type Page } from '@playwright/test';

const SELECT_PAGE = '/components/inputs/select-box';
// the site header carries its own compact select boxes
const CONTENT_SELECT_BOX =
  'oge-select-box:not(.app-version-select):not(.app-theme-select)';

const height = async (locator: Locator): Promise<number> =>
  (await locator.boundingBox())?.height ?? 0;

async function setSize(locator: Locator, size: string): Promise<void> {
  await locator.evaluate((el, cls) => {
    el.classList.remove('oge-input-xs', 'oge-input-sm', 'oge-input-lg');
    if (cls) el.classList.add(cls);
  }, size);
}

test.describe('control heights', () => {
  for (const [size, cls, expected] of [
    ['xs', 'oge-input-xs', 24],
    ['sm', 'oge-input-sm', 28],
    ['md', '', 34],
    ['lg', 'oge-input-lg', 42],
  ] as const) {
    test(`a tag box with chips and a select box agree at ${size}`, async ({
      page,
    }) => {
      await page.goto(SELECT_PAGE);
      const tagBox = page.locator('oge-tag-box', { hasText: 'Skills' }).first();
      await expect(tagBox.locator('.oge-tag').first()).toBeVisible();
      const selectBox = page.locator(CONTENT_SELECT_BOX).first();
      // one chip: the assertion is about the row height, not about wrapping
      await tagBox
        .locator('.oge-tag')
        .evaluateAll((tags) => tags.slice(1).forEach((tag) => tag.remove()));
      await setSize(tagBox, cls);
      await setSize(selectBox, cls);
      expect(await height(tagBox.locator('.oge-input-container'))).toBeCloseTo(
        expected,
        0,
      );
      expect(
        await height(selectBox.locator('.oge-input-container')),
      ).toBeCloseTo(expected, 0);
    });
  }

  test('the tokens rescale buttons and fields with rem values', async ({
    page,
  }) => {
    await page.goto('/components/buttons');
    await page.addStyleTag({
      content: ':root { --oge-control-height-md: 3rem; }',
    });
    const button = page.locator('oge-button .oge-button-native', {
      hasText: 'Medium',
    });
    expect(await height(button.first())).toBeCloseTo(48, 0);

    await page.goto(SELECT_PAGE);
    await page.addStyleTag({
      content: ':root { --oge-control-height-md: 3rem; }',
    });
    expect(
      await height(
        page.locator(`${CONTENT_SELECT_BOX} .oge-input-container`).first(),
      ),
    ).toBeCloseTo(48, 0);
  });
});

test.describe('surfaces under a capturing ancestor', () => {
  async function capture(page: Page, target: Locator): Promise<void> {
    await target.evaluate((el) => {
      const parent = el.parentElement as HTMLElement;
      parent.style.transform = 'translateX(40px) scale(0.95)';
      parent.style.overflow = 'hidden';
    });
    await page.waitForTimeout(0);
  }

  async function expectAligned(anchor: Locator, popup: Locator): Promise<void> {
    await expect
      .poll(async () => {
        const a = await anchor.boundingBox();
        const p = await popup.boundingBox();
        return a && p ? Math.round(p.y - (a.y + a.height)) : null;
      })
      .toBeGreaterThanOrEqual(0);
    const a = (await anchor.boundingBox())!;
    const p = (await popup.boundingBox())!;
    expect(p.y - (a.y + a.height)).toBeLessThan(20);
    expect(Math.abs(p.x - a.x)).toBeLessThan(4);
  }

  test('a tag box popup is aligned, unclipped and follows the scroll', async ({
    page,
  }) => {
    await page.goto(SELECT_PAGE);
    const tagBox = page.locator('oge-tag-box', { hasText: 'Skills' }).first();
    await tagBox.scrollIntoViewIfNeeded();
    await capture(page, tagBox);
    const anchor = tagBox.locator('.oge-input-container');
    await tagBox.locator('.oge-input-native').click();
    const popup = page.locator('.oge-popup').first();
    await expect(popup).toBeVisible();
    expect(await popup.evaluate((el) => el.matches(':popover-open'))).toBe(
      true,
    );
    await expectAligned(anchor, popup);
    const hit = await popup.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
    await page.evaluate(() => window.scrollBy(0, 24));
    await expectAligned(anchor, popup);
  });

  test('an unaffected popup stays out of the top layer', async ({ page }) => {
    await page.goto(SELECT_PAGE);
    const tagBox = page.locator('oge-tag-box', { hasText: 'Skills' }).first();
    await tagBox.locator('.oge-input-native').click();
    const popup = page.locator('.oge-popup').first();
    await expect(popup).toBeVisible();
    expect(await popup.getAttribute('popover')).toBeNull();
  });

  test('a modal covers the viewport and Escape still closes it', async ({
    page,
  }) => {
    await page.goto('/components/overlay/modal');
    const modalHost = page.locator('oge-modal').first();
    await capture(page, modalHost);
    await page.locator('oge-button', { hasText: /open/i }).first().click();
    const layer = page.locator('.oge-modal-layer');
    await expect(layer).toBeVisible();
    await expect(layer).toHaveAttribute('popover', 'manual');
    const box = (await layer.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.y).toBeCloseTo(0, 0);
    expect(box.width).toBeCloseTo(viewport.width, 0);
    expect(box.height).toBeCloseTo(viewport.height, 0);
    await page.keyboard.press('Escape');
    await expect(layer).toHaveCount(0);
  });
});
