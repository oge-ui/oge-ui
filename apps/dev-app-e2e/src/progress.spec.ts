import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * What e2e must prove for the loading trio is the aria progressbar contract
 * in a real DOM — most of all that the indeterminate state OMITS
 * aria-valuenow — plus a clean axe run over all three components.
 */

test('determinate bar carries the full aria triple and updates', async ({
  page,
}) => {
  await page.goto('/components/progress');
  const demo = page.locator('app-demo-card:has(#determinate-bar)');
  const bar = demo.locator('oge-progress-bar').first();
  await bar.scrollIntoViewIfNeeded();

  await expect(bar).toHaveAttribute('role', 'progressbar');
  await expect(bar).toHaveAttribute('aria-valuemin', '0');
  await expect(bar).toHaveAttribute('aria-valuemax', '100');
  await expect(bar).toHaveAttribute('aria-valuenow', '80');
  await expect(bar).toHaveAttribute('aria-label', 'Progress');

  await demo.locator('input[type="range"]').fill('120');
  await expect(bar).toHaveAttribute('aria-valuenow', '100'); // clamped ratio 1
  // The MB-formatted sibling feeds aria-valuetext from formatLabel.
  const formatted = demo.locator('oge-progress-bar').nth(1);
  await expect(formatted).toHaveAttribute('aria-valuetext', '120 MB');
});

test('indeterminate omits aria-valuenow — never a sentinel', async ({
  page,
}) => {
  await page.goto('/components/progress');
  const demo = page.locator('app-demo-card:has(#indeterminate-buffer)');
  const bar = demo.locator('oge-progress-bar').first();
  await bar.scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute('role', 'progressbar');
  await expect(bar).not.toHaveAttribute('aria-valuenow', /.*/);

  const ring = page
    .locator('app-demo-card:has(#load-indicator) oge-load-indicator')
    .first();
  await ring.scrollIntoViewIfNeeded();
  await expect(ring).toHaveAttribute('role', 'progressbar');
  await expect(ring).not.toHaveAttribute('aria-valuenow', /.*/);
});

test('chunked bar renders segments; skeletons stay decoration', async ({
  page,
}) => {
  await page.goto('/components/progress');
  const chunks = page.locator(
    'app-demo-card:has(#chunks-severity) .oge-progress-bar-chunk',
  );
  await chunks.first().scrollIntoViewIfNeeded();
  await expect(chunks).toHaveCount(5);
  await expect(
    page.locator(
      'app-demo-card:has(#chunks-severity) .oge-progress-bar-chunk-filled',
    ),
  ).toHaveCount(3); // round(0.6 × 5)

  const skeleton = page
    .locator('app-demo-card:has(#skeleton) oge-skeleton')
    .first();
  await skeleton.scrollIntoViewIfNeeded();
  await expect(skeleton).toHaveAttribute('aria-hidden', 'true');
});

test('the async flow ends in a one-shot completed', async ({ page }) => {
  await page.goto('/components/progress');
  const demo = page.locator('app-demo-card:has(#a-real-async-flow)');
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole('button', { name: 'Start download' }).click();
  // Indeterminate first (no valuenow), then determinate, then done.
  await expect(demo.locator('oge-progress-bar')).not.toHaveAttribute(
    'aria-valuenow',
    /.*/,
  );
  await expect(demo.locator('[data-testid="download-done"]')).toBeVisible({
    timeout: 10000,
  });
});

test('progress page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/progress');
  await expect(page.locator('oge-progress-bar').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-progress-bar')
      .include('oge-load-indicator')
      .include('oge-skeleton')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
