import { test, expect, type Locator } from '@playwright/test';

/**
 * Under `prefers-reduced-motion: reduce` the components drop their
 * transitions (and script motion jumps instead of gliding). Each probe reads
 * the computed `transition-duration` list and expects every entry to be ~0.
 */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function expectNoTransition(target: Locator): Promise<void> {
  await expect(target).toBeAttached();
  const durations = await target.evaluate((el) =>
    getComputedStyle(el)
      .transitionDuration.split(',')
      .map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 0.001 : 1)),
  );
  for (const seconds of durations) expect(seconds).toBeLessThanOrEqual(0.01);
}

test('toggle controls: switch, radio and check box glyphs do not animate', async ({
  page,
}) => {
  await page.goto('/components/inputs/toggle-controls');
  const toggle = page.locator('oge-switch').first();
  await expectNoTransition(toggle.locator('.oge-switch-thumb'));
  await expectNoTransition(toggle.locator('.oge-switch-track'));
  await expectNoTransition(page.locator('.oge-radio-dot').first());
  await expectNoTransition(page.locator('.oge-check-box-icon').first());
});

test('buttons and tabs do not animate', async ({ page }) => {
  await page.goto('/components/buttons');
  await expectNoTransition(page.locator('.oge-button-native').first());

  await page.goto('/components/tabs');
  await expectNoTransition(page.locator('.oge-tab').first());
});

test('select box options do not animate', async ({ page }) => {
  await page.goto('/components/inputs/select-box');
  const select = page.locator('oge-select-box').first();
  await select.locator('.oge-input-container').click();
  const option = page.locator('.oge-select-option').first();
  await expect(option).toBeVisible();
  await expectNoTransition(option);
});

test('a control animates normally without the preference', async ({ page }) => {
  // guards the probe itself: the same thumb does transition by default
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/components/inputs/toggle-controls');
  const duration = await page
    .locator('oge-switch .oge-switch-thumb')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeGreaterThan(0);
});
