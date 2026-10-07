import { test, expect, type Page } from '@playwright/test';

const ORIGIN = 'https://www.ogeui.com';

/**
 * Pages that used to share their family's (or the home page's) description —
 * one family overview, its sub-pages and its API page, plus the guides.
 */
const PAGES = [
  '/components',
  '/ai',
  '/license',
  '/changelog',
  '/bundle-size',
  '/getting-started',
  '/getting-started/setup',
  '/getting-started/tokens',
  '/getting-started/theme-builder',
  '/components/data-grid',
  '/components/data-grid/filtering',
  '/components/data-grid/editing',
  '/components/data-grid/export',
  '/components/data-grid/api',
  '/components/tree-list/summaries',
  '/components/inputs/date-box',
  '/components/overlay/modal',
  '/components/tabs',
  '/components/tree-view',
] as const;

async function head(page: Page) {
  return page.evaluate(() => {
    const blocks = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ].map((script) => JSON.parse(script.textContent ?? 'null'));
    const nodes = blocks.flatMap((block) => block['@graph'] ?? [block]);
    return {
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? '',
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
        '',
      title: document.title,
      h1: document.querySelectorAll('h1').length,
      types: nodes.map((node) => node['@type'] as string),
      breadcrumbs: nodes.find((node) => node['@type'] === 'BreadcrumbList') as
        { itemListElement: { name: string; item: string }[] } | undefined,
    };
  });
}

test.describe('per-page SEO', () => {
  test('every page has its own description, title and breadcrumb trail', async ({
    page,
  }) => {
    test.slow();
    const descriptions = new Map<string, string>();
    const titles = new Map<string, string>();
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const meta = await head(page);

      expect(meta.canonical, path).toBe(ORIGIN + path);
      expect(meta.h1, `${path}: h1 count`).toBe(1);
      expect(meta.description.length, path).toBeGreaterThanOrEqual(140);
      expect(meta.description.length, path).toBeLessThanOrEqual(160);
      expect(descriptions.get(meta.description), path).toBeUndefined();
      expect(titles.get(meta.title), path).toBeUndefined();
      descriptions.set(meta.description, path);
      titles.set(meta.title, path);

      const trail = meta.breadcrumbs?.itemListElement ?? [];
      expect(trail[0]?.name, path).toBe('Home');
      expect(trail.at(-1)?.item, path).toBe(meta.canonical);
    }
  });

  test('a family sub-page trail runs Home → Components → Family → Page', async ({
    page,
  }) => {
    await page.goto('/components/data-grid/filtering');
    await expect(page.locator('h1').first()).toBeVisible();
    const { breadcrumbs } = await head(page);
    expect(breadcrumbs?.itemListElement.map((crumb) => crumb.name)).toEqual([
      'Home',
      'Components',
      'Data Grid',
      'Data Grid Filtering',
    ]);
  });

  test('titles name the frameworks a page exists in', async ({ page }) => {
    await page.goto('/components/data-grid/filtering');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveTitle(
      'Data Grid Filtering for Angular and React | OGE UI',
    );
    // the router-driven demo has no React layer, so it does not promise one
    await page.goto('/components/tabs/routed');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveTitle('Angular Routed Tabs | OGE UI');
    await page.goto('/');
    await expect(page).toHaveTitle(/Angular and React/);
  });

  test('routed demo children canonicalize to the page they belong to', async ({
    page,
  }) => {
    await page.goto('/components/tabs/routed/members');
    await expect(page.locator('h1').first()).toBeVisible();
    const meta = await head(page);
    expect(meta.canonical).toBe(`${ORIGIN}/components/tabs/routed/overview`);
    expect(meta.breadcrumbs?.itemListElement.at(-1)?.item).toBe(meta.canonical);
  });

  test('the home page describes the software and has no trail', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    const meta = await head(page);
    expect(meta.types).toEqual(
      expect.arrayContaining([
        'WebSite',
        'SoftwareApplication',
        'SoftwareSourceCode',
      ]),
    );
    expect(meta.breadcrumbs).toBeUndefined();
    expect(meta.canonical).toBe(`${ORIGIN}/`);
  });
});
