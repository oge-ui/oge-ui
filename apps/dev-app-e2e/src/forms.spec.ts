import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Smoke + axe coverage for the forms pages. `color-contrast` is excluded —
 * demo palette tuning is a docs concern, not a form-markup concern.
 */
test.beforeEach(() => test.slow());

async function scanForms(page: import('@playwright/test').Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.oge-form')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
}

test('form overview renders and has no axe violations', async ({ page }) => {
  await page.goto('/components/forms');
  await expect(page.locator('.oge-form').first()).toBeVisible();
  await expect(page.locator('fieldset.oge-form-group').first()).toBeVisible();
  await scanForms(page);
});

test('form layout page has no axe violations', async ({ page }) => {
  await page.goto('/components/forms/layout');
  await expect(page.locator('.oge-form').first()).toBeVisible();
  await scanForms(page);
});

test('validation page has no axe violations', async ({ page }) => {
  await page.goto('/components/forms/validation');
  await expect(page.locator('.oge-form').first()).toBeVisible();
  await scanForms(page);
});

test('a failed submit announces a summary and focuses the first invalid field', async ({
  page,
}) => {
  await page.goto('/components/forms');
  const form = page.locator('.oge-form').last();
  await expect(form).toBeVisible();

  await form.getByRole('button', { name: 'Create' }).click();

  const summary = form.locator('oge-validation-summary');
  await expect(summary).toHaveAttribute('role', 'alert');
  await expect(summary.locator('.oge-validation-summary-link')).toHaveCount(2);

  // focus landed on the first invalid editor
  await expect(form.locator('input').first()).toBeFocused();
});

test('a summary row focuses the field it names', async ({ page }) => {
  await page.goto('/components/forms/validation');
  // scope to the summary demo — the page has several forms
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Validation summary' })
    .first();
  const form = card.locator('oge-form');
  const summary = card.locator('oge-validation-summary');

  await summary.locator('.oge-validation-summary-link').nth(1).click();
  await expect(form.locator('input').nth(1)).toBeFocused();
});

test('a tab section reveals and focuses the invalid field on submit', async ({
  page,
}) => {
  await page.goto('/components/forms/layout');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Tab sections' })
    .first();

  // the invalid field lives in the second tab, which starts unselected
  const employment = card.getByRole('tab', { name: /Employment/ });
  await expect(employment).toHaveAttribute('aria-selected', 'false');

  await card.getByRole('button', { name: /Submit/ }).click();

  await expect(employment).toHaveAttribute('aria-selected', 'true');
  await expect(card.locator('oge-validation-summary')).toBeVisible();
});

test('an accordion section expands around the invalid field on submit', async ({
  page,
}) => {
  await page.goto('/components/forms/layout');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Accordion sections' })
    .first();

  await expect(card.locator('.oge-accordion-invalid-dot')).toHaveCount(1);
  await expect(card.locator('[aria-expanded="true"]')).toHaveCount(0);

  await card.getByRole('button', { name: /Submit/ }).click();

  await expect(card.locator('[aria-expanded="true"]')).toHaveCount(1);
});

test('a schema with layout metadata renders a form with no items', async ({
  page,
}) => {
  await page.goto('/components/forms/validation');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Schema-carried layout' })
    .first();

  const form = card.locator('oge-form');
  // the labels come from the schema's OGE_FORM_LABEL, not from any items array
  const labels = form.locator('.oge-input-label');
  await expect(labels.filter({ hasText: 'Full name' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'E-mail address' })).toHaveCount(1);
  await expect(form.locator('fieldset.oge-form-group > legend')).toHaveText(
    'Contact',
  );
  await expect(form.locator('oge-text-area')).toHaveCount(1);
});
