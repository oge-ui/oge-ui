import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * There is no ARIA card pattern, so what e2e must prove is the *absence* of
 * accidental semantics — no role, no tabindex, no nested-interactive — and
 * that the documented stretched-link pattern survives a real axe run.
 */
test('the card renders no role and its stretched-link demo passes axe', async ({
  page,
}) => {
  await page.goto('/components/card');

  const first = page.locator('oge-card').first();
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('role', /.*/);
  await expect(first).not.toHaveAttribute('tabindex', /.*/);

  // The clickable demo: one primary link inside a positioned card.
  const clickable = page.locator(
    'app-demo-card:has(#clickable-cards-accessibly) oge-card',
  );
  await clickable.scrollIntoViewIfNeeded();
  await expect(clickable.locator('a')).toHaveCount(1);
});

test('loading swaps content for an aria-busy skeleton', async ({ page }) => {
  await page.goto('/components/card');
  const demo = page.locator('app-demo-card:has(#status-loading)');
  const card = demo.locator('oge-card', { hasText: 'Weekly report' });
  await card.scrollIntoViewIfNeeded();

  await expect(card).toHaveAttribute('aria-busy', 'true');
  await expect(card.locator('.oge-card-skeleton')).toBeVisible();
  await expect(card.locator('.oge-card-content')).toHaveCount(0);

  await demo.getByRole('button', { name: 'Toggle loading' }).click();
  await expect(card).not.toHaveAttribute('aria-busy', /.*/);
  await expect(card.locator('.oge-card-skeleton')).toHaveCount(0);
  await expect(card.locator('.oge-card-content')).toBeVisible();
});

test('card page has no axe violations (light and dark)', async ({ page }) => {
  await page.goto('/components/card');
  await expect(page.locator('oge-card').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-card')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
