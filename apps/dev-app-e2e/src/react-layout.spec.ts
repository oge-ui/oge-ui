import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the layout family (ADR 0002 + `docs/REACT-PARITY.md`).
 * The package ships as five route families — accordion, card, progress,
 * splitter and toolbar — each with an overview and an API page.
 */
const REACT = '?framework=react';

const FAMILIES = [
  'accordion',
  'card',
  'progress',
  'splitter',
  'toolbar',
] as const;

test.describe('React layout docs', () => {
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

    test(`the ${family} api page renders the React tables`, async ({
      page,
    }) => {
      await page.goto(`/components/${family}/api${REACT}`);
      await expect(page.getByRole('status')).toHaveCount(0);
      await expect(page.locator('.api-table').first()).toBeVisible();
    });
  }

  test('the React accordion expands a panel on click', async ({ page }) => {
    await page.goto(`/components/accordion${REACT}`);
    const header = page.locator('app-react-host [aria-expanded]').first();
    await expect(header).toBeVisible();
    const before = await header.getAttribute('aria-expanded');
    await header.click();
    await expect
      .poll(async () => header.getAttribute('aria-expanded'))
      .not.toBe(before);
  });

  test('the React splitter exposes the APG separator contract', async ({
    page,
  }) => {
    await page.goto(`/components/splitter${REACT}`);
    const separator = page.locator('app-react-host [role="separator"]').first();
    await expect(separator).toBeVisible();
    await expect(separator).toHaveAttribute('aria-valuenow', /\d/);
    // the keyboard resizes it
    const before = await separator.getAttribute('aria-valuenow');
    await separator.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => separator.getAttribute('aria-valuenow'))
      .not.toBe(before);
  });

  test('the React progress bar reports the ARIA contract', async ({ page }) => {
    await page.goto(`/components/progress${REACT}`);
    const bar = page.locator('app-react-host [role="progressbar"]').first();
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  test('React layout pages have no axe violations', async ({ page }) => {
    test.slow();
    for (const family of FAMILIES) {
      for (const route of [
        `/components/${family}`,
        `/components/${family}/api`,
      ]) {
        await page.goto(`${route}${REACT}`);
        // Wait for the page to actually render before auditing it: an empty
        // page has zero status elements too, so `toHaveCount(0)` alone lets
        // axe run against a blank document and report phantom violations
        // (`page-has-heading-one` was the tell).
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.getByRole('status')).toHaveCount(0);
        // heading-order (h1 → demo-card h3) is the site-wide demo-card
        // pattern, identical in the Angular views — a best-practice flag, not
        // a WCAG failure, and not something the React layer introduced.
        const results = await new AxeBuilder({ page })
          .disableRules(['color-contrast', 'heading-order'])
          .analyze();
        expect(results.violations, `axe violations on ${route}`).toEqual([]);
      }
    }
  });
});
