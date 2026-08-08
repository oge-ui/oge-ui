import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('tabs overview renders and switches tabs by click', async ({ page }) => {
  await page.goto('/components/tabs');
  const firstPanel = page.locator('.oge-tab-panel').first();
  await expect(firstPanel.getByRole('tab', { name: 'Overview' })).toBeVisible();

  await firstPanel.getByRole('tab', { name: 'Activity' }).click();
  await expect(
    firstPanel.getByRole('tab', { name: 'Activity' }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(firstPanel.getByText('Latest activity feed…')).toBeVisible();
});

test('arrow keys move selection with a roving tabindex', async ({ page }) => {
  await page.goto('/components/tabs');
  const firstPanel = page.locator('.oge-tab-panel').first();
  const overview = firstPanel.getByRole('tab', { name: 'Overview' });
  await overview.click();
  await overview.press('ArrowRight');
  await expect(
    firstPanel.getByRole('tab', { name: 'Activity' }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(firstPanel.getByRole('tab', { name: 'Activity' })).toBeFocused();
});

test('closable demo removes a tab through the ✕ button', async ({ page }) => {
  await page.goto('/components/tabs');
  const closeCard = page
    .locator('app-demo-card')
    .filter({ hasText: 'Closable tabs' });
  const tab = closeCard.getByRole('tab', { name: /a\.ts/ });
  // the ✕ is a presentational span — a focusable control inside role="tab"
  // would be a nested-interactive a11y violation
  await tab.locator('.oge-tab-close').click();
  await expect(closeCard.getByRole('tab', { name: /a\.ts/ })).toHaveCount(0);
});

test('tabs overview has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/tabs');
  await expect(page.locator('.oge-tab').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-tab-panel')
    .include('.oge-tabs')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
