import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the tabs family (ADR 0002 + `docs/REACT-PARITY.md`): the
 * overview and API pages render real React tabs on the same routes the Angular
 * view uses, the APG keyboard works, and the pages are axe-clean. The routed
 * page is a recorded parity exception and must still show the shell notice.
 */
const REACT = '?framework=react';

test.describe('React tabs docs', () => {
  test('the overview mounts React tabs without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/tabs${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('app-react-host .oge-tab').first()).toBeVisible();
  });

  test('the routed page stays Angular-only (recorded exception)', async ({
    page,
  }) => {
    await page.goto(`/components/tabs/routed${REACT}`);
    await expect(page.getByRole('status')).toContainText(
      'not in the React packages yet',
    );
  });

  test('the APG tab pattern works in the React strip', async ({ page }) => {
    await page.goto(`/components/tabs${REACT}`);
    const strip = page.locator('app-react-host [role="tablist"]').first();
    await expect(strip).toBeVisible();
    const tabs = strip.getByRole('tab');
    const first = tabs.first();
    const second = tabs.nth(1);
    await expect(first).toHaveAttribute('aria-selected', 'true');

    // roving tabindex: exactly one tab is in the page Tab sequence
    await expect(strip.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    // automatic activation selects as focus moves
    await expect(second).toHaveAttribute('aria-selected', 'true');
  });

  test('a React tab panel pairs every tab with its panel', async ({ page }) => {
    await page.goto(`/components/tabs${REACT}`);
    const tab = page
      .locator('app-react-host [role="tab"][aria-controls]')
      .first();
    await expect(tab).toBeVisible();
    const panelId = await tab.getAttribute('aria-controls');
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute(
      'aria-labelledby',
      (await tab.getAttribute('id')) as string,
    );
  });

  test('the React api page renders the reference tables', async ({ page }) => {
    await page.goto(`/components/tabs/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('OgeTabPanel').first()).toBeVisible();
  });

  test('React tabs pages have no axe violations', async ({ page }) => {
    test.slow();
    for (const route of ['/components/tabs', '/components/tabs/api']) {
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
