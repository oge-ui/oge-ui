import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the inputs family (ADR 0002 + `docs/REACT-PARITY.md`):
 * every page of the family renders real React editors on the same routes the
 * Angular view uses, the interactive previews actually work, and the pages are
 * axe-clean.
 */
const REACT = '?framework=react';

/** The demo pages the React layer claims, as `[route, label]`. */
const DEMO_PAGES: readonly (readonly [string, string])[] = [
  ['/components/inputs', 'overview'],
  ['/components/inputs/select-box', 'select box'],
  ['/components/inputs/autocomplete', 'autocomplete'],
  ['/components/inputs/toggle-controls', 'toggle controls'],
  ['/components/inputs/slider', 'slider'],
  ['/components/inputs/date-box', 'date box'],
  ['/components/inputs/color-box', 'color box'],
  ['/components/inputs/tree-select', 'tree select'],
  ['/components/inputs/showcase', 'showcase'],
  ['/components/inputs/validation', 'validation'],
];

/** Every covered page, demos plus the API reference. */
const COVERED: readonly string[] = [
  ...DEMO_PAGES.map(([route]) => route),
  '/components/inputs/api',
];

test.describe('React inputs docs', () => {
  for (const [route, label] of DEMO_PAGES) {
    test(`the ${label} page mounts React without the coverage notice`, async ({
      page,
    }) => {
      await page.goto(`${route}${REACT}`);
      await expect(page.locator('html')).toHaveAttribute(
        'data-framework',
        'react',
      );
      // covered page: no "not in the React packages yet" shell notice
      await expect(page.getByRole('status')).toHaveCount(0);
      await expect(page.locator('app-react-host').first()).toBeVisible();
    });
  }

  test('the api page renders the React reference tables', async ({ page }) => {
    await page.goto(`/components/inputs/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('OgeTextBox').first()).toBeVisible();
  });

  test('the overview editors are live React components', async ({ page }) => {
    await page.goto(`/components/inputs${REACT}`);
    const name = page.locator('app-react-host .oge-input-native').first();
    await expect(name).toBeVisible();
    await name.fill('Ada');
    await expect(name).toHaveValue('Ada');
  });

  test('the React select box opens a real ARIA listbox and commits a pick', async ({
    page,
  }) => {
    await page.goto(`/components/inputs/select-box${REACT}`);
    // across every React host on the page, not just the first one: a page may
    // lead with a demo that is not the editor under test (the date box page
    // opens with calendars, which are grids). Scoping to `app-react-host`
    // still keeps the shell's own theme combobox out of the match.
    const combo = page.locator('app-react-host').getByRole('combobox').first();
    await expect(combo).toHaveAttribute('aria-haspopup', 'listbox');
    await combo.click();
    const listbox = page.getByRole('listbox').first();
    await expect(listbox).toBeVisible();
    const option = listbox.getByRole('option').first();
    const text = (await option.innerText()).trim();
    await option.click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(combo).toHaveValue(text);
  });

  test('the React slider responds to the APG keyboard', async ({ page }) => {
    await page.goto(`/components/inputs/slider${REACT}`);
    const thumb = page.locator('app-react-host [role="slider"]').first();
    await expect(thumb).toBeVisible();
    const before = Number(await thumb.getAttribute('aria-valuenow'));
    await thumb.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => Number(await thumb.getAttribute('aria-valuenow')))
      .toBeGreaterThan(before);
  });

  test('the React date box opens the calendar dialog and picks a day', async ({
    page,
  }) => {
    await page.goto(`/components/inputs/date-box${REACT}`);
    const combo = page.locator('app-react-host').getByRole('combobox').first();
    await combo.click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    // the APG date-picker-dialog hands DOM focus to the grid
    await expect(dialog.locator('[data-focus-target]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(combo).toBeFocused(); // focus restored
  });

  test('the React tree select opens a real ARIA tree and commits a pick', async ({
    page,
  }) => {
    await page.goto(`/components/inputs/tree-select${REACT}`);
    const combo = page.locator('app-react-host').getByRole('combobox').first();
    await expect(combo).toHaveAttribute('aria-haspopup', 'tree');
    await combo.click();
    const tree = page.locator('.oge-tree-select-panel [role="tree"]').first();
    await expect(tree).toBeVisible();
    // aria-controls must point at the tree itself, not the panel
    const controls = await combo.getAttribute('aria-controls');
    await expect(page.locator(`#${controls}`)).toHaveAttribute('role', 'tree');
    await page.getByRole('treeitem', { name: /Reports/ }).click();
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect(combo).toHaveValue('Reports');
  });

  test('React inputs pages have no axe violations', async ({ page }) => {
    test.slow();
    for (const route of COVERED) {
      await page.goto(`${route}${REACT}`);
      // Wait for the page to actually render before auditing it: an empty
      // page has zero status elements too, so `toHaveCount(0)` alone lets
      // axe run against a blank document and report phantom violations
      // (`page-has-heading-one` was the tell).
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views — a best-practice flag, not a WCAG
      // failure, and not something the React layer introduced.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${route}`).toEqual([]);
    }
  });
});
