import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The APG breadcrumb is a structural pattern — what e2e must prove is the
 * landmark/list/aria-current contract in a real DOM, plus the container-width
 * collapse flow jsdom cannot lay out: squeeze → ellipsis appears → menu opens
 * with the hidden crumbs as real links → widen → full trail returns.
 */

const DEMO = 'app-demo-card:has(#getting-started)';

test('renders the APG landmark contract', async ({ page }) => {
  await page.goto('/components/breadcrumb');
  const nav = page.locator(`${DEMO} nav.oge-breadcrumb-nav`).first();
  await expect(nav).toBeVisible();
  // Distinct per instance — several breadcrumbs share the docs page, and axe
  // landmark-unique requires distinguishable landmark labels.
  await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb — getting started');
  await expect(nav.locator('ol')).toHaveCount(1);

  const crumbs = nav.locator('.oge-breadcrumb-item');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.first()).toHaveAttribute('href', /.+/); // a real link
  await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');
  // The disabled crumb is exposed but inert; the current page is not a link.
  await expect(
    nav.locator('.oge-breadcrumb-item[aria-disabled="true"]'),
  ).toHaveCount(1);
  await expect(crumbs.last()).not.toHaveAttribute('href', /.+/);
});

test('clicking a crumb reports item and index', async ({ page }) => {
  await page.goto('/components/breadcrumb');
  const nav = page.locator(`${DEMO} nav.oge-breadcrumb-nav`).first();
  await nav.locator('.oge-breadcrumb-item').first().click();
  await expect(page.locator('[data-testid="breadcrumb-log"]')).toContainText(
    'home [0]',
  );
});

test('squeezing collapses the oldest middle crumbs into a link menu', async ({
  page,
}) => {
  await page.goto('/components/breadcrumb');
  const demo = page.locator('app-demo-card:has(#collapse-modes)');
  await demo.scrollIntoViewIfNeeded();
  const visible = demo.locator(
    '.oge-breadcrumb-li:not(.oge-breadcrumb-li-hidden):not(.oge-breadcrumb-ellipsis-li) .oge-breadcrumb-item',
  );
  await expect(visible).toHaveCount(5);

  await demo.locator('input[type="range"]').fill('260');
  const ellipsis = demo.locator(
    '.oge-breadcrumb-ellipsis-li:not(.oge-breadcrumb-li-parked) .oge-breadcrumb-ellipsis',
  );
  await expect(ellipsis).toBeVisible();
  // First and last crumbs always stay visible.
  await expect(visible.first()).toContainText('Home');
  await expect(visible.last()).toContainText('Mechanical');

  await ellipsis.click();
  const menu = page.locator('.oge-menu-list');
  await expect(menu).toBeVisible();
  const rows = menu.locator('.oge-menu-item');
  // The oldest middle crumbs collapsed first — and they are real links.
  await expect(rows.first()).toContainText('Products');
  await expect(rows.first()).toHaveAttribute('href', /.+/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.oge-menu-list')).toHaveCount(0);
  await expect(ellipsis).toBeFocused();

  // Widening restores the full trail and parks the ellipsis again.
  await demo.locator('input[type="range"]').fill('640');
  await expect(visible).toHaveCount(5);
  await expect(ellipsis).toHaveCount(0);
});

test('breadcrumb page has no axe violations (light and dark)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/components/breadcrumb');
  await expect(page.locator('oge-breadcrumb').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-breadcrumb')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
