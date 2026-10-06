import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Inline alert — the live-region role rule (alert vs status by severity,
 * none with live="off"), the visually hidden severity prefix, dismiss moving
 * focus past the alert, and a clean axe run, in both render layers.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

for (const fw of FRAMEWORKS) {
  test.describe(`alert (${fw.name})`, () => {
    test('role follows the severity', async ({ page }) => {
      await page.goto(`/components/alert${fw.query}`);
      const demo = card(page, 'severities');
      const alerts = demo.locator('.oge-alert');
      await alerts.first().scrollIntoViewIfNeeded();
      await expect(alerts).toHaveCount(4);
      await expect(alerts.nth(0)).toHaveAttribute('role', 'status');
      await expect(alerts.nth(1)).toHaveAttribute('role', 'status');
      await expect(alerts.nth(2)).toHaveAttribute('role', 'alert');
      await expect(alerts.nth(3)).toHaveAttribute('role', 'alert');
      await expect(alerts.nth(2).locator('.oge-sr-only')).toHaveText(
        /^\s*Warning\s*$/,
      );
      await expect(alerts.nth(0).locator('.oge-alert-icon')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    test('dismiss closes and moves focus past the alert', async ({ page }) => {
      await page.goto(`/components/alert${fw.query}`);
      const demo = card(page, 'title-actions-dismiss');
      const alert = demo.locator('.oge-alert');
      const dismiss = demo.getByRole('button', {
        name: 'Dismiss',
        exact: true,
      });
      await dismiss.scrollIntoViewIfNeeded();
      await dismiss.focus();
      await page.keyboard.press('Enter');
      await expect(alert).toBeHidden();
      // focus landed on the next control, not on <body>
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.tagName))
        .not.toBe('BODY');
      await demo
        .getByRole('button', { name: 'Show again', exact: true })
        .click();
      await expect(alert).toBeVisible();
      await expect(alert).toHaveAttribute('role', 'alert');
    });

    test('a hidden alert keeps its role; live="off" has none', async ({
      page,
    }) => {
      await page.goto(`/components/alert${fw.query}`);
      const demo = card(page, 'live-regions');
      const saved = demo.locator('.oge-alert').first();
      await demo.scrollIntoViewIfNeeded();
      await expect(saved).toBeHidden();
      await expect(saved).toHaveAttribute('role', 'status');
      await demo
        .getByRole('button', { name: 'Toggle saved', exact: true })
        .click();
      await expect(saved).toBeVisible();
      await expect(saved).toContainText('Draft saved.');
      await expect(demo.locator('.oge-alert').nth(1)).not.toHaveAttribute(
        'role',
        /.+/,
      );
    });

    test('alert page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/alert${fw.query}`);
      await expect(page.locator('.oge-alert').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
