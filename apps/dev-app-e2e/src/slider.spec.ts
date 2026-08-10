import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * jsdom cannot lay out a track or deliver a real drag — this suite proves the
 * pointer math (mouse.down/move/up against real geometry), the APG keyboard
 * walk on a real focus model, the multi-thumb constraint and a clean axe run.
 */

const BASIC = 'app-demo-card:has(#getting-started)';
const RANGE = 'app-demo-card:has(#range-slider)';

test('keyboard walks the APG slider contract', async ({ page }) => {
  await page.goto('/components/inputs/slider');
  const thumb = page.locator(`${BASIC} .oge-slider-thumb`).first();
  await thumb.scrollIntoViewIfNeeded();

  await thumb.focus();
  await page.keyboard.press('ArrowRight');
  await expect(thumb).toHaveAttribute('aria-valuenow', '41');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('PageUp'); // largeStep default = step × 10
  await expect(thumb).toHaveAttribute('aria-valuenow', '50');
  await page.keyboard.press('End');
  await expect(thumb).toHaveAttribute('aria-valuenow', '100');
  await page.keyboard.press('Home');
  await expect(thumb).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('[data-testid="slider-value"]')).toHaveText('0');
});

test('dragging commits live and Escape cancels the gesture', async ({
  page,
}) => {
  await page.goto('/components/inputs/slider');
  const track = page.locator(`${BASIC} .oge-slider-track`).first();
  const thumb = page.locator(`${BASIC} .oge-slider-thumb`).first();
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;

  // Drag the thumb toward ~80%.
  const startX = box.x + box.width * 0.4;
  await page.mouse.move(startX, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
    steps: 5,
  });
  const during = Number(await thumb.getAttribute('aria-valuenow'));
  expect(during).toBeGreaterThan(60); // live commit mid-drag
  await page.mouse.up();
  const released = Number(await thumb.getAttribute('aria-valuenow'));
  expect(released).toBeGreaterThan(60);

  // Escape mid-drag restores the PRE-GESTURE value — the OGE extra. Pin a
  // known start first (the drag left focus on the thumb).
  await page.keyboard.press('Home');
  await expect(thumb).toHaveAttribute('aria-valuenow', '0');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, {
    steps: 3,
  });
  const midDrag = Number(await thumb.getAttribute('aria-valuenow'));
  expect(midDrag).toBeGreaterThan(50);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(thumb).toHaveAttribute('aria-valuenow', '0');
});

test('the range thumbs constrain each other with minRange', async ({
  page,
}) => {
  await page.goto('/components/inputs/slider');
  const thumbs = page.locator(`${RANGE} .oge-slider-thumb`);
  await thumbs.first().scrollIntoViewIfNeeded();

  await expect(thumbs.nth(0)).toHaveAttribute('aria-valuemax', '550'); // 600 − 50
  await expect(thumbs.nth(1)).toHaveAttribute('aria-valuemin', '250'); // 200 + 50

  // End cannot cross start + minRange.
  await thumbs.nth(1).focus();
  await page.keyboard.press('Home');
  await expect(thumbs.nth(1)).toHaveAttribute('aria-valuenow', '250');
  await expect(page.locator('[data-testid="range-value"]')).toContainText(
    '200 – 250',
  );
});

test('slider page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/inputs/slider');
  await expect(page.locator('oge-slider').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-slider')
      .include('oge-range-slider')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
