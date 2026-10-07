import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('home / landing page', () => {
  test(
    'renders the animated hero without the docs sidebar',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/');
      // framework-neutral hero copy (ADR 0002): the h1 names no framework, the
      // hero switch beside it does
      await expect(
        page.getByRole('heading', { level: 1, name: /UI components/ }),
      ).toBeVisible();
      // landing renders full-bleed: no sidebar nav, no page filter box
      await expect(page.getByPlaceholder('Filter pages…')).toHaveCount(0);
      // the live demo is the real grid
      await expect(page.locator('app-home .oge-grid').first()).toBeVisible();
    },
  );

  test('demo window tabs switch the live component', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Tree List' }).click();
    await expect(page.locator('app-home oge-tree-list')).toBeVisible();
    await page.getByRole('tab', { name: 'Buttons' }).click();
    await expect(
      page.locator('app-home oge-button', { hasText: 'Async save' }),
    ).toBeVisible();
  });

  test('hero select popup aligns with its field (no transformed ancestor)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Select' }).click();
    const select = page.locator('app-home oge-select-box').first();
    await select.locator('.oge-input-native').click();
    const popup = page.locator('app-home .oge-popup');
    await expect(popup).toBeVisible();
    const field = await select.locator('.oge-input-container').boundingBox();
    const panel = await popup.boundingBox();
    // a transformed ancestor (tilt/entrance animation) would throw the
    // fixed-position popup hundreds of pixels off — assert alignment with a
    // few px of slack for sub-pixel entrance-animation residue
    expect(Math.abs(panel.x - field.x)).toBeLessThan(4);
    expect(panel.y).toBeGreaterThan(field.y);
    expect(panel.y - (field.y + field.height)).toBeLessThan(40);
  });

  test('the component index always ends on a full row', async ({ page }) => {
    // 4 / 3 / 2 / 1 columns: the closing "browse all" tile fills what the
    // last row of families leaves free, so the grid never ends ragged
    for (const width of [1440, 1100, 800, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const all = page.locator('app-home .og-row-all');
      await all.scrollIntoViewIfNeeded();
      // the gap between the tile's end and the grid's end (polled: the
      // reveal animation and the layout settle after navigation)
      await expect
        .poll(
          async () => {
            const grid = await all.locator('xpath=..').boundingBox();
            const tile = await all.boundingBox();
            if (!grid || !tile) return Number.POSITIVE_INFINITY;
            return Math.abs(grid.x + grid.width - (tile.x + tile.width));
          },
          { message: `closing tile reaches the row end at ${width}px` },
        )
        .toBeLessThan(2);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('CTA navigates into the docs shell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Get started', exact: true }).click();
    await expect(page).toHaveURL(/\/getting-started$/);
    // docs shell (sidebar) is back
    await expect(page.getByPlaceholder('Filter pages…')).toBeVisible();
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    const scan = () =>
      new AxeBuilder({ page })
        .include('app-home')
        .disableRules(['color-contrast'])
        .analyze();

    await page.goto('/');
    await expect(page.locator('app-home .oge-grid').first()).toBeVisible();
    let results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
