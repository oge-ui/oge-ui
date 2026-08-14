import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the navigation family (ADR 0002 + `docs/REACT-PARITY.md`).
 * The package ships as six route families. The tree view owns the family's
 * overview and API pages; the rest are single-page families.
 *
 * `breadcrumb/routed` and `menubar/routed` are deliberately absent: both demo
 * Angular-router integration and stay Angular-only, so a React reader gets the
 * coverage notice there. That is asserted at the bottom rather than left
 * untested — a recorded exception nobody checks is indistinguishable from a
 * silent gap.
 */
const REACT = '?framework=react';

const FAMILIES = [
  'tree-view',
  'drawer',
  'stepper',
  'menubar',
  'breadcrumb',
  'pagination',
] as const;

test.describe('React navigation docs', () => {
  for (const family of FAMILIES) {
    test(`the ${family} overview mounts React without the coverage notice`, async ({
      page,
    }) => {
      await page.goto(`/components/${family}${REACT}`);
      await expect(page.locator('html')).toHaveAttribute(
        'data-framework',
        'react',
      );
      await expect(page.getByRole('status')).toHaveCount(0);
      await expect(page.locator('app-react-host').first()).toBeVisible();
    });
  }

  test('the tree view api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/tree-view/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
  });

  test('the React tree view is a keyboard-navigable APG tree', async ({
    page,
  }) => {
    await page.goto(`/components/tree-view${REACT}`);
    const tree = page.locator('app-react-host [role="tree"]').first();
    await expect(tree).toBeVisible();
    const items = tree.locator('[role="treeitem"]');
    await expect(items.first()).toBeVisible();
    // roving tabindex: exactly one item is in the Tab order
    await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(
      1,
    );
    // ArrowDown moves the roving focus off the first item
    await items.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(items.first()).toHaveAttribute('tabindex', '-1');
  });

  test('the React drawer opens as a modal dialog and Escape closes it', async ({
    page,
  }) => {
    await page.goto(`/components/drawer${REACT}`);
    // A closed drawer stays mounted and goes `inert` + `aria-hidden` rather
    // than unmounting, so visibility is the wrong signal here — the aria
    // state is the contract, and it is what a screen reader acts on.
    const card = page.locator('app-demo-card', { hasText: 'Modal drawer' });
    const dialog = card.locator('[role="dialog"]').first();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-hidden', 'true');

    // by name, not by position — the demo card's own chrome (the "show code"
    // toggle) is also a button inside this container
    await card.getByRole('button', { name: 'Open menu' }).click();
    await expect(dialog).not.toHaveAttribute('aria-hidden', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  test('the React stepper marks the active step without claiming a tablist', async ({
    page,
  }) => {
    await page.goto(`/components/stepper${REACT}`);
    // Deliberately NOT role="tablist"/"tab": the suite emits one semantic in
    // both orientations (`aria-current="step"` + `role="group"` bodies),
    // because a tablist promises panels may be browsed freely — which is
    // exactly what a linear stepper forbids. The Angular stepper documents
    // the same choice, so asserting it here keeps both layers honest.
    const host = page.locator('app-react-host').first();
    await expect(host.locator('[role="tab"]')).toHaveCount(0);
    await expect(host.locator('[aria-current="step"]').first()).toBeVisible();
    await expect(host.locator('[role="group"]').first()).toBeAttached();
  });

  test('the React menubar opens a submenu with the keyboard', async ({
    page,
  }) => {
    await page.goto(`/components/menubar${REACT}`);
    const bar = page.locator('app-react-host [role="menubar"]').first();
    await expect(bar).toBeVisible();
    const first = bar.locator('[role="menuitem"]').first();
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[role="menu"]').first()).toBeVisible();
  });

  test('the React breadcrumb is a labelled nav landmark', async ({ page }) => {
    await page.goto(`/components/breadcrumb${REACT}`);
    const nav = page.locator('app-react-host nav').first();
    await expect(nav).toBeVisible();
    // the last crumb is the current page and is not a link
    await expect(
      page.locator('app-react-host [aria-current="page"]').first(),
    ).toBeVisible();
  });

  test('the React pagination moves pages', async ({ page }) => {
    await page.goto(`/components/pagination${REACT}`);
    const current = page
      .locator('app-react-host [aria-current="page"]')
      .first();
    await expect(current).toBeVisible();
    const before = await current.textContent();
    await page
      .locator('app-react-host [role="navigation"], app-react-host nav')
      .first()
      .getByRole('button')
      .last()
      .click();
    await expect
      .poll(async () =>
        page
          .locator('app-react-host [aria-current="page"]')
          .first()
          .textContent(),
      )
      .not.toBe(before);
  });

  test('the routed pages stay Angular-only and say so', async ({ page }) => {
    for (const route of [
      '/components/breadcrumb/routed',
      '/components/menubar/routed',
    ]) {
      await page.goto(`${route}${REACT}`);
      // the coverage notice is the contract: React readers must never get
      // silent Angular content on a page their layer does not cover
      await expect(page.getByRole('status').first()).toBeVisible();
    }
  });

  test('React navigation pages have no axe violations', async ({ page }) => {
    test.slow();
    for (const family of FAMILIES) {
      await page.goto(`/components/${family}${REACT}`);
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
      expect(results.violations, `axe violations on ${family}`).toEqual([]);
    }
  });
});
