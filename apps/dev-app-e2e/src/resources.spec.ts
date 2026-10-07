import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The Resources pages: `/changelog` (CHANGELOG.md rendered at build time) and
 * `/bundle-size` (tools/size-budgets.json as a sortable table).
 */

test.describe('changelog page', () => {
  test('renders every release with its own anchor and rail entry', async ({
    page,
  }) => {
    await page.goto('/changelog');
    await expect(page.locator('h1')).toHaveText('Changelog');
    await expect(page.locator('h2#unreleased')).toBeVisible();
    await expect(page.locator('h2#v1-1-2')).toContainText('2026-10-04');
    await expect(
      page.getByRole('navigation', { name: 'On this page' }).getByRole('link', {
        name: 'v1.1.2',
      }),
    ).toBeVisible();
    // change groups are linkable too, prefixed by their release
    await expect(page.locator('h3[id^="v1-1-2-"]').first()).toBeVisible();
  });

  test('a deep link lands on its release, and the heading link keeps the hash', async ({
    page,
  }) => {
    await page.goto('/changelog#v0-13-0');
    await expect(page.locator('h2#v0-13-0')).toBeInViewport();
    await page.locator('h2#v1-1-1 a').first().click();
    await expect(page).toHaveURL(/\/changelog#v1-1-1$/);
    await expect(page.locator('h2#v1-1-1')).toBeInViewport();
  });

  test('the sidebar version badge opens the changelog', async ({ page }) => {
    await page.goto('/getting-started');
    await page
      .getByRole('navigation', { name: 'Documentation' })
      .getByRole('link', { name: /^v\d+\.\d+\.\d+/ })
      .click();
    await expect(page).toHaveURL(/\/changelog$/);
  });
});

test.describe('bundle size page', () => {
  test('lists every entry point grouped by package with license markers', async ({
    page,
  }) => {
    await page.goto('/bundle-size');
    const table = page.getByRole('table');
    await expect(
      table
        .getByRole('rowheader', { name: '@oge-ui/grid', exact: true })
        .first(),
    ).toBeVisible();
    const pivot = table
      .getByRole('row')
      .filter({
        has: page.getByRole('rowheader', {
          name: '@oge-ui/pivot',
          exact: true,
        }),
      })
      .filter({ hasText: 'kB' });
    await expect(pivot.first()).toContainText('Commercial');
    const grid = table
      .getByRole('row')
      .filter({
        has: page.getByRole('rowheader', { name: '@oge-ui/grid', exact: true }),
      })
      .filter({ hasText: 'kB' });
    await expect(grid.first()).toContainText('MIT');
  });

  test('sorts by size and filters by license', async ({ page }) => {
    await page.goto('/bundle-size');
    const sizeHeader = page.getByRole('columnheader', { name: /Gzip/ });
    await expect(sizeHeader).not.toHaveAttribute('aria-sort', /./);
    await sizeHeader.getByRole('button').click();
    await expect(sizeHeader).toHaveAttribute('aria-sort', 'descending');

    // sizes in the first package group now run largest first
    const firstGroup = page.locator('table tbody').first();
    await expect
      .poll(async () => {
        const cells = await firstGroup
          .locator('td.tabular-nums:not(.text-gray-500)')
          .allTextContents();
        const values = cells.map((text) => parseFloat(text));
        return values.every((value, i) => i === 0 || values[i - 1] >= value);
      })
      .toBe(true);

    await page.getByRole('button', { name: 'Commercial', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Commercial', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('table')).not.toContainText('MIT');
  });

  test('has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/bundle-size');
    await expect(page.getByRole('table')).toBeVisible();
    // the breadcrumb belongs to the shared doc header (every docs page has
    // it), so it is out of this page's scope
    const results = await new AxeBuilder({ page })
      .include('main')
      .exclude('app-doc-header nav')
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
