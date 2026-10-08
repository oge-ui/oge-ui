import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The high-contrast theme is the one place the suite promises contrast
 * numbers (AAA-ish text, 3:1 UI), so unlike `a11y.spec.ts` this scan keeps
 * axe's `color-contrast` rule ON.
 */
test.beforeEach(() => test.slow());

test('data grid under the high-contrast theme passes axe incl. color-contrast', async ({
  page,
}) => {
  await page.goto('/components/data-grid');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  // the docs theme select: the suite's own select box
  await page.locator('.app-theme-select .oge-input-container').click();
  await page
    .locator('.oge-select-option', { hasText: 'High contrast' })
    .click();
  await expect(page.locator('html')).toHaveClass(/oge-theme-high-contrast/);
  // the grid header follows the high-contrast tokens (#f2f2f2)
  await expect
    .poll(() =>
      page
        .locator('.oge-header-cell')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe('rgb(242, 242, 242)');

  const results = await new AxeBuilder({ page }).include('.oge-grid').analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});

test('high contrast over the dark docs mode: the docs turn light, tabs pass color-contrast', async ({
  page,
}) => {
  // The palette is tuned for its own light surface. Tabs, text buttons and
  // links have no background, so on the dark docs chrome the selected tab
  // read dark blue on near-black (the old visual baseline); the docs now
  // render light while the theme is active.
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('spec-seeded')) return;
      sessionStorage.setItem('spec-seeded', '1');
      localStorage.setItem('oge-docs-mode', 'dark');
      localStorage.setItem('oge-docs-grid-theme', 'high-contrast');
    } catch {
      // storage blocked — the class assertions below fail loudly
    }
  });
  await page.goto('/components/tabs');
  const html = page.locator('html');
  await expect(html).toHaveClass(/oge-theme-high-contrast/);
  await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(html).not.toHaveClass(/oge-theme-dark/);
  const selected = page.locator('.oge-tab[aria-selected="true"]').first();
  await expect(selected).toBeVisible();
  // the selected label is the high-contrast accent (#0037b3)
  await expect
    .poll(() => selected.evaluate((el) => getComputedStyle(el).color))
    .toBe('rgb(0, 55, 179)');
  const results = await new AxeBuilder({ page })
    .include('.oge-tab-strip')
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
  // the light/dark switch says why it is off and keeps the stored mode
  const modeButton = page.getByRole('button', {
    name: /high-contrast theme is a light theme/,
  });
  await expect(modeButton).toHaveAttribute('aria-disabled', 'true');
  await modeButton.dispatchEvent('click');
  await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('oge-docs-mode')))
    .toBe('dark');
});
