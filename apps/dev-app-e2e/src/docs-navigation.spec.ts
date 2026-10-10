import { test, expect, type Page } from '@playwright/test';

/**
 * The docs shell's navigation: the docked sidebar (collapsible sections that
 * remember their state, a page filter, `aria-current`) from the `lg`
 * breakpoint up, and the off-canvas drawer below it (menu button, focus
 * trap, Escape / backdrop / navigation close it, page scroll locked).
 */

const sidebar = (page: Page) =>
  page.getByRole('navigation', { name: 'Documentation' });

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('docs sidebar (desktop)', () => {
  test('marks the current page and opens its section', async ({ page }) => {
    await page.goto('/components/data-grid/sorting');
    const nav = sidebar(page);
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText('Sorting & Paging');
    await expect(current).toBeInViewport();
    await expect(
      nav.getByRole('button', { name: 'Data Grid', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    // no menu button while the sidebar is docked
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeHidden();
  });

  test('a section collapses out of the tab order and stays collapsed after a reload', async ({
    page,
  }) => {
    await page.goto('/getting-started');
    const nav = sidebar(page);
    const toggle = nav.getByRole('button', { name: 'Guides', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator(
      `#${await toggle.getAttribute('aria-controls')}`,
    );
    await expect(panel.getByRole('link', { name: 'Testing' })).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('inert', '');
    await expect(panel.getByRole('link', { name: 'Testing' })).toBeHidden();

    await page.reload();
    await expect(
      sidebar(page).getByRole('button', { name: 'Guides', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false');

    // and back open, also remembered
    await sidebar(page)
      .getByRole('button', { name: 'Guides', exact: true })
      .click();
    await page.reload();
    await expect(
      sidebar(page).getByRole('button', { name: 'Guides', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  test('the filter reveals matches in collapsed families and says when nothing matches', async ({
    page,
  }) => {
    await page.goto('/getting-started');
    const nav = sidebar(page);
    // component families start collapsed
    await expect(
      nav.getByRole('button', { name: 'Scheduler', exact: false }),
    ).toHaveAttribute('aria-expanded', 'false');
    const filter = nav.getByRole('searchbox', { name: 'Filter pages' });
    await filter.fill('time zones');
    await expect(nav.getByRole('link', { name: 'Time zones' })).toBeVisible();
    await filter.fill('zzzz-no-such-page');
    await expect(nav.getByRole('status')).toContainText('No page titles match');
    // Escape clears the filter
    await filter.press('Escape');
    await expect(filter).toHaveValue('');
    await expect(nav.getByRole('link', { name: 'Introduction' })).toBeVisible();
  });

  test('commercial families carry a license badge', async ({ page }) => {
    await page.goto('/getting-started');
    const nav = sidebar(page);
    await expect(
      nav.getByRole('button', {
        name: /^Pivot Grid Pro\b.*commercial license$/,
      }),
    ).toBeVisible();
    await expect(
      nav.getByRole('button', { name: 'Data Grid', exact: true }),
    ).toBeVisible();
  });
});

test.describe('docs navigation drawer (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test(
    'opens from the menu button, traps focus and closes on Escape',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto('/components/data-grid');
      const nav = sidebar(page);
      const menu = page.getByRole('button', { name: 'Open navigation' });
      // closed: the drawer is out of reach
      await expect(nav).toBeHidden();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toHaveAttribute('aria-controls', 'app-sidebar');

      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(nav).toBeInViewport();
      const close = nav.getByRole('button', { name: 'Close navigation' });
      await expect(close).toBeFocused();
      // the page behind neither scrolls nor takes focus
      await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
      await expect(page.locator('main')).toHaveAttribute('inert', '');
      // Shift+Tab from the first control (the brand link) wraps to the
      // drawer's last one, and Tab from there back to the first
      const brand = nav.getByRole('link', { name: 'OGE logo OGE' });
      await page.keyboard.press('Shift+Tab');
      await expect(brand).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        nav.getByRole('link', { name: /^v\d+\.\d+\.\d+/ }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(brand).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(nav).toBeHidden();
      await expect(menu).toBeFocused();
      await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    },
  );

  test(
    'closes on a backdrop tap and after navigating',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto('/components/data-grid');
      const nav = sidebar(page);
      const menu = page.getByRole('button', { name: 'Open navigation' });

      await menu.click();
      await expect(nav).toBeInViewport();
      // the strip right of the drawer is backdrop
      await page.mouse.click(380, 600);
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(nav).toBeHidden();

      await menu.click();
      await expect(nav).toBeInViewport();
      await nav.locator('a[href="/components/data-grid/filtering"]').click();
      await expect(page).toHaveURL(/\/components\/data-grid\/filtering$/);
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(nav).toBeHidden();
      // reopened, the new page is the current entry
      await menu.click();
      await expect(nav.locator('[aria-current="page"]')).toHaveText(
        'Filtering',
      );
    },
  );

  test(
    'representative pages never scroll sideways',
    { tag: '@mobile' },
    async ({ page }) => {
      for (const path of [
        '/getting-started',
        '/getting-started/tokens',
        '/components/data-grid',
        '/components/data-grid/api',
        '/components/scheduler',
        '/guides/performance',
        '/ai',
        '/changelog',
      ]) {
        await page.goto(path);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect
          .poll(() => overflow(page), { message: path })
          .toBeLessThanOrEqual(0);
      }
    },
  );
});

test.describe('docs header between the breakpoints', () => {
  for (const width of [768, 1024]) {
    test(`fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/components/data-grid', '/guides/performance']) {
        await page.goto(path);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect
          .poll(() => overflow(page), { message: `${path} @ ${width}px` })
          .toBeLessThanOrEqual(0);
      }
      // the drawer takes over below lg (64rem), the docked sidebar above
      const menu = page.getByRole('button', { name: 'Open navigation' });
      if (width < 1024) await expect(menu).toBeVisible();
      else await expect(menu).toBeHidden();
    });
  }
});
