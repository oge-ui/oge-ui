import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

const scan = (page: Page, include: string) =>
  new AxeBuilder({ page })
    .include(include)
    .disableRules(['color-contrast'])
    .analyze();

test.describe('buttons API reference', () => {
  test('renders sectioned tables and filters by name', async ({ page }) => {
    await page.goto('/components/buttons/api');
    await expect(page.locator('#ogebutton-properties')).toBeVisible();
    await expect(page.locator('#ogebutton .api-table').first()).toBeVisible();
    await expect(page.locator('#ogedropdownbutton-methods')).toBeVisible();

    const filter = page.locator('#ogebutton input[type="search"]').first();
    await filter.fill('holdToConfirm');
    await expect(
      page.locator('#ogebutton td code', { hasText: 'holdToConfirm' }).first(),
    ).toBeVisible();
    await expect(page.locator('#ogebutton-events')).toHaveCount(0);
    await filter.fill('');
    await expect(page.locator('#ogebutton-events')).toBeVisible();
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    await page.goto('/components/buttons/api');
    await expect(page.locator('.api-table').first()).toBeVisible();
    let results = await scan(page, 'app-api-reference');
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan(page, 'app-api-reference');
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('inputs API reference', () => {
  test('shows common vs specific member groups', async ({ page }) => {
    await page.goto('/components/inputs/api');
    await expect(
      page.locator('h4', { hasText: 'Common — field chrome' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('#ogetextbox h4', { hasText: 'OgeTextBox' }),
    ).toBeVisible();
    await expect(
      page.locator('#ogenumberbox td code', { hasText: 'showSpinButtons' }),
    ).toBeVisible();
  });
});

test.describe('data components API reference', () => {
  test('grid API page renders all sections and filters methods', async ({
    page,
  }) => {
    await page.goto('/components/data-grid/api');
    await expect(page.locator('#ogegrid-properties')).toBeVisible();
    await expect(page.locator('#ogegrid-methods')).toBeVisible();
    await expect(page.locator('#ogegrid-events')).toBeVisible();
    await expect(page.locator('#ogecolumn-properties')).toBeVisible();
    const filter = page.locator('#ogegrid input[type="search"]');
    await filter.fill('beginCustomLoading');
    await expect(
      page.locator('#ogegrid td code', { hasText: 'beginCustomLoading' }),
    ).toBeVisible();
    await expect(page.locator('#ogegrid-properties')).toHaveCount(0);
  });

  test('tree-list and pivot API pages render', async ({ page }) => {
    await page.goto('/components/tree-list/api');
    await expect(page.locator('#ogetreelist-methods')).toBeVisible();
    await expect(
      page.locator('#ogetreelist td code', { hasText: 'rowExpanding' }).first(),
    ).toBeVisible();
    await page.goto('/components/pivot-grid/api');
    await expect(page.locator('#ogepivotgrid-methods')).toBeVisible();
    await expect(page.locator('#ogepivotfield-properties')).toBeVisible();
  });

  test('grid API page has no axe violations (light and dark)', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/components/data-grid/api');
    await expect(page.locator('.api-table').first()).toBeVisible();
    let results = await scan(page, 'app-api-reference');
    expect(results.violations.map((v) => v.id)).toEqual([]);
    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan(page, 'app-api-reference');
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('overlay pages', () => {
  test('overview renders the menu list and opens the anchored panel', async ({
    page,
  }) => {
    await page.goto('/components/overlay');
    await expect(page.locator('.oge-menu-list')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle panel' }).click();
    await expect(page.locator('.oge-popup')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.oge-popup')).toHaveCount(0);
  });

  test('API page renders and has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/components/overlay/api');
    await expect(page.locator('#ogemenulist-properties')).toBeVisible();
    await expect(
      page.locator('#resolvepopupposition .api-table').first(),
    ).toBeVisible();
    const results = await scan(page, 'app-api-reference');
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('menubar API reference', () => {
  test('renders the menubar sections on the navigation API page and filters', async ({
    page,
  }) => {
    await page.goto('/components/tree-view/api');
    await expect(page.locator('#ogemenubar-properties')).toBeVisible();
    await expect(page.locator('#ogemenubar-events')).toBeVisible();
    await expect(page.locator('#ogemenubar-methods')).toBeVisible();
    await expect(page.locator('#ogemenubaritem-properties')).toBeVisible();

    const filter = page.locator('#ogemenubar input[type="search"]').first();
    await filter.fill('compactBelow');
    await expect(
      page.locator('#ogemenubar td code', { hasText: 'compactBelow' }).first(),
    ).toBeVisible();
    await expect(page.locator('#ogemenubar-events')).toHaveCount(0);
    await filter.fill('');
    await expect(page.locator('#ogemenubar-events')).toBeVisible();
  });
});

test.describe('breadcrumb API reference', () => {
  test('renders the breadcrumb sections on the navigation API page and filters', async ({
    page,
  }) => {
    await page.goto('/components/tree-view/api');
    await expect(page.locator('#ogebreadcrumb-properties')).toBeVisible();
    await expect(page.locator('#ogebreadcrumb-events')).toBeVisible();
    await expect(page.locator('#ogebreadcrumbitem-properties')).toBeVisible();

    const filter = page.locator('#ogebreadcrumb input[type="search"]').first();
    await filter.fill('collapseMode');
    await expect(
      page
        .locator('#ogebreadcrumb td code', { hasText: 'collapseMode' })
        .first(),
    ).toBeVisible();
    await expect(page.locator('#ogebreadcrumb-events')).toHaveCount(0);
    await filter.fill('');
    await expect(page.locator('#ogebreadcrumb-events')).toBeVisible();
  });
});

test.describe('slider API reference', () => {
  test('renders both slider sections on the inputs API page and filters', async ({
    page,
  }) => {
    await page.goto('/components/inputs/api');
    await expect(page.locator('#ogeslider-properties')).toBeVisible();
    await expect(page.locator('#ogeslider-events')).toBeVisible();
    await expect(page.locator('#ogerangeslider-properties')).toBeVisible();

    const filter = page.locator('#ogeslider input[type="search"]').first();
    await filter.fill('valueIndicator');
    await expect(
      page
        .locator('#ogeslider td code', { hasText: 'valueIndicator' })
        .first(),
    ).toBeVisible();
    await filter.fill('');
    await expect(page.locator('#ogeslider-events')).toBeVisible();
  });
});
