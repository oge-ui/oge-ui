import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The app bar is chrome, not a widget: e2e proves the section layout, that a
 * landmark appears only where a demo opts in (never a second banner on the
 * docs page), that sticky bars really stick inside their scroll box, and a
 * clean axe run — in both render layers.
 */
const FRAMEWORKS = [
  ['Angular', ''],
  ['React', '?framework=react'],
] as const;

for (const [name, query] of FRAMEWORKS) {
  test.describe(`${name} app bar`, () => {
    test('places content into the three sections', async ({ page }) => {
      await page.goto(`/components/app-bar${query}`);
      const demo = page.locator('app-demo-card:has(#sections)');
      const bar = demo.locator('.oge-app-bar');
      await bar.scrollIntoViewIfNeeded();
      await expect(
        bar.locator('.oge-app-bar-start').getByRole('button', {
          name: 'Open menu',
          exact: true,
        }),
      ).toBeVisible();
      await expect(bar.locator('.oge-app-bar-center')).toHaveText('Inbox');
      await expect(bar.locator('.oge-app-bar-end button')).toHaveCount(2);
      // no landmark unless asked for
      await expect(bar).not.toHaveAttribute('role', /.*/);
      await expect(bar).not.toHaveAttribute('aria-label', /.*/);

      await bar.getByRole('button', { name: 'Search', exact: true }).click();
      await expect
        .poll(async () => demo.getByTestId('app-bar-last').textContent())
        .toContain('search');
    });

    test('adds a named landmark only where the demo opts in', async ({
      page,
    }) => {
      await page.goto(`/components/app-bar${query}`);
      const nav = page.getByRole('navigation', {
        name: 'Project',
        exact: true,
      });
      await nav.scrollIntoViewIfNeeded();
      await expect(nav).toHaveClass(/oge-app-bar/);
      // the docs page keeps exactly its own banner
      await expect(page.locator('.oge-app-bar[role="banner"]')).toHaveCount(0);
    });

    test('sticky bars stick to their scroll container', async ({ page }) => {
      await page.goto(`/components/app-bar${query}`);
      const demo = page.locator('app-demo-card:has(#sticky-fixed-safe-areas)');
      const box = demo.getByRole('region', {
        name: 'Scrolling article',
        exact: true,
      });
      const bar = box.locator('.oge-app-bar');
      await box.scrollIntoViewIfNeeded();
      await expect(bar).toHaveCSS('position', 'sticky');
      await expect(bar).toHaveCSS('top', '0px');
      await box.evaluate((el) => el.scrollTo({ top: 200 }));
      await expect
        .poll(async () => {
          const [boxTop, barTop] = await Promise.all([
            box.evaluate((el) => el.getBoundingClientRect().top),
            bar.evaluate((el) => el.getBoundingClientRect().top),
          ]);
          return Math.round(barTop - boxTop);
        })
        .toBeLessThanOrEqual(1);

      const bottom = page
        .locator('app-demo-card:has(#bottom-bar)')
        .locator('.oge-app-bar');
      await bottom.scrollIntoViewIfNeeded();
      await expect(bottom).toHaveClass(/oge-app-bar-bottom/);
      await expect(bottom).toHaveCSS('bottom', '0px');
    });

    test('has no axe violations and no sideways scroll at 390px', async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/components/app-bar${query}`);
      await expect(page.locator('.oge-app-bar').first()).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
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

    test('the API page renders its tables', async ({ page }) => {
      await page.goto(`/components/app-bar/api${query}`);
      await expect(page.locator('.api-table').first()).toBeVisible();
    });
  });
}
