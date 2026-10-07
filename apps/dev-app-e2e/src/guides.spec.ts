import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * The Guides section (`/guides/*`): every guide renders its title, its "On
 * this page" anchors resolve to headings, the Angular / React switch changes
 * what a guide shows, and two representative guides pass axe.
 */
test.use({ locale: 'en-US', timezoneId: 'UTC' });

const GUIDES = [
  { path: '/guides', title: 'Guides', heading: 'frameworks-and-tooling' },
  {
    path: '/guides/angular-ssr',
    title: 'Angular SSR, hydration and zoneless',
    heading: 'the-event-replay-fold',
  },
  {
    path: '/guides/nextjs',
    title: 'Next.js App Router',
    heading: 'client-components',
  },
  {
    path: '/guides/build-tools',
    title: 'Vite, Angular CLI and Nx',
    heading: 'nx-workspaces',
  },
  { path: '/guides/testing', title: 'Testing', heading: 'jsdom-gaps' },
  {
    path: '/guides/performance',
    title: 'Performance',
    heading: 'virtualization',
  },
  {
    path: '/guides/security',
    title: 'CSP and Trusted Types',
    heading: 'trusted-types',
  },
  { path: '/guides/headless', title: 'Headless engines', heading: 'licensing' },
  {
    path: '/guides/accessibility',
    title: 'Accessibility',
    heading: 'keyboard-maps',
  },
  {
    path: '/guides/accessibility/conformance',
    title: 'Accessibility conformance report',
    heading: 'level-aa',
  },
  {
    path: '/guides/versioning',
    title: 'Versioning and deprecation',
    heading: 'deprecations',
  },
] as const;

/** Every "On this page" link points at a heading the page renders. */
async function expectTocResolves(page: Page): Promise<void> {
  const toc = page.getByRole('navigation', { name: 'On this page' });
  const links = toc.getByRole('link');
  // the rail docks at xl widths; its links exist (hidden) below that
  await expect.poll(() => links.count()).toBeGreaterThan(1);
  const hrefs = await links.evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
  );
  for (const href of hrefs) {
    await expect(page.locator(`h2${href}`), href).toHaveCount(1);
  }
}

test.describe('guides', () => {
  for (const guide of GUIDES) {
    test(`${guide.path} renders with its headings`, async ({ page }) => {
      await page.goto(guide.path);
      await expect(page.locator('h1')).toHaveText(guide.title);
      await expect(page.locator(`h2#${guide.heading}`)).toBeVisible();
      if (guide.path !== '/guides') await expectTocResolves(page);
    });
  }

  test('the sidebar lists the guides and the index links to each', async ({
    page,
  }) => {
    await page.goto('/guides');
    const sidebar = page.getByRole('navigation', { name: 'Documentation' });
    await expect(
      sidebar.getByRole('link', { name: 'CSP & Trusted Types' }),
    ).toBeVisible();
    const main = page.locator('main');
    for (const guide of GUIDES.slice(1)) {
      await expect(
        main.locator(`a[href="${guide.path}"]`).first(),
        guide.path,
      ).toBeVisible();
    }
    await main.locator('a[href="/guides/testing"]').first().click();
    await expect(page).toHaveURL(/\/guides\/testing$/);
    await expect(page.locator('h1')).toHaveText('Testing');
  });

  test('a heading anchor deep link lands on its section', async ({ page }) => {
    await page.goto('/guides/performance#bundle-size');
    await expect(page.locator('h2#bundle-size')).toBeInViewport();
    // the bundle numbers are the CI baseline, formatted in kB
    await expect(
      page.getByRole('region', { name: 'Gzip size of selected entry points' }),
    ).toContainText('@oge-ui/grid');
    await expect(
      page.getByRole('region', { name: 'Gzip size of selected entry points' }),
    ).toContainText(/\d+\.\d kB/);
  });

  test('the testing guide follows the framework switch', async ({ page }) => {
    await page.goto('/guides/testing');
    await expect(page.locator('main')).toContainText('TestBed');
    await page.goto('/guides/testing?framework=react');
    await expect(page.locator('main')).toContainText('React Testing Library');
    await expect(page.locator('main')).toContainText('@testing-library/react');
  });

  test('the accessibility guide renders the generated keyboard maps', async ({
    page,
  }) => {
    await page.goto('/guides/accessibility');
    const treeView = page.getByRole('region', {
      name: 'OgeTreeView — Keyboard (WAI-ARIA APG treeview)',
    });
    await expect(treeView).toContainText('Right Arrow');
    await expect(treeView.getByRole('rowheader').first()).toBeVisible();
    await expect(page.locator('h3#keys-ogepivotgrid')).toBeVisible();
  });

  test('the conformance report lists every WCAG 2.2 A and AA criterion', async ({
    page,
  }) => {
    await page.goto('/guides/accessibility/conformance');
    await expect(page.locator('main')).toContainText('self-assessed');
    const levelA = page.getByRole('region', {
      name: 'WCAG 2.2 level A success criteria',
    });
    const levelAA = page.getByRole('region', {
      name: 'WCAG 2.2 level AA success criteria',
    });
    await expect(levelA.locator('tbody tr')).toHaveCount(31);
    await expect(levelAA.locator('tbody tr')).toHaveCount(24);
    await expect(
      levelAA.getByRole('row', { name: /2\.5\.7 Dragging Movements/ }),
    ).toContainText('Supports');
  });

  for (const path of [
    '/guides/security',
    '/guides/accessibility/conformance',
  ]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      test.slow();
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('main')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  }
});
