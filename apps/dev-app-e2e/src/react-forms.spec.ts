import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The React view of the forms family (ADR 0002 + `docs/REACT-PARITY.md`): all
 * four pages render real React forms on the same routes the Angular view uses,
 * the layout / sections / validation behaviour is the Angular behaviour, and
 * the pages are axe-clean.
 */
const REACT = '?framework=react';

test.describe('React forms docs', () => {
  test('the overview mounts a React form without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/forms${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.locator('app-react-host .oge-form').first(),
    ).toBeVisible();
  });

  test('a field edit flows through the React model', async ({ page }) => {
    await page.goto(`/components/forms${REACT}`);
    const first = page.locator('app-react-host .oge-form input').first();
    await first.fill('Grace');
    await expect(
      page.locator('app-react-host p', { hasText: 'formData →' }).first(),
    ).toContainText('Grace');
  });

  test('a group renders a real fieldset with its legend', async ({ page }) => {
    await page.goto(`/components/forms${REACT}`);
    const legend = page
      .locator('app-react-host fieldset > legend', { hasText: 'Identity' })
      .first();
    await expect(legend).toBeVisible();
  });

  test('the layout page renders tab and accordion sections', async ({
    page,
  }) => {
    await page.goto(`/components/forms/layout${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.locator('app-react-host .oge-form-tabs [role="tab"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('app-react-host .oge-form-accordion').first(),
    ).toBeVisible();
  });

  test('a failed submit reveals the tab holding the invalid field', async ({
    page,
  }) => {
    await page.goto(`/components/forms/layout${REACT}`);
    const section = page.locator('app-react-host .oge-form-tabs').first();
    const employment = section.getByRole('tab', { name: 'Employment' });
    await expect(section.getByRole('tab').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page
      .getByRole('button', { name: 'Submit (Title is empty)' })
      .first()
      .click();
    await expect(employment).toHaveAttribute('aria-selected', 'true');
  });

  test('the validation page shows a rule message under the field', async ({
    page,
  }) => {
    await page.goto(`/components/forms/validation${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    const email = page
      .locator('app-react-host .oge-form input[type="text"]')
      .nth(1);
    await email.fill('not-an-email');
    await email.blur();
    await expect(
      page.locator('app-react-host .oge-input-error').first(),
    ).toBeVisible();
  });

  test('the React api page renders the reference tables', async ({ page }) => {
    await page.goto(`/components/forms/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('<OgeForm>').first()).toBeVisible();
  });

  test('React forms pages have no axe violations', async ({ page }) => {
    test.slow();
    for (const route of [
      '/components/forms',
      '/components/forms/layout',
      '/components/forms/validation',
      '/components/forms/api',
    ]) {
      await page.goto(`${route}${REACT}`);
      // Wait for the page to actually render before auditing it: an empty
      // page has zero status elements too.
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${route}`).toEqual([]);
    }
  });
});
