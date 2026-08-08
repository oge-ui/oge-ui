import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('expanding a panel collapses its sibling in single mode', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const first = page.locator('.oge-accordion').first();
  const account = first.getByRole('button', { name: /Account/ });
  const notifications = first.getByRole('button', { name: /Notifications/ });

  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');

  await notifications.click();
  await expect(notifications).toHaveAttribute('aria-expanded', 'true');
  await expect(account).toHaveAttribute('aria-expanded', 'false');
});

test('every header is in the Tab sequence and arrows move focus', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const first = page.locator('.oge-accordion').first();
  const account = first.getByRole('button', { name: /Account/ });

  await account.focus();
  await expect(account).toHaveAttribute('tabindex', '0');

  await account.press('ArrowDown');
  await expect(
    first.getByRole('button', { name: /Notifications/ }),
  ).toBeFocused();

  await page.keyboard.press('Home');
  await expect(account).toBeFocused();
});

test('the last open panel cannot be collapsed without collapsible', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const first = page.locator('.oge-accordion').first();
  const account = first.getByRole('button', { name: /Account/ });

  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  // APG: aria-disabled, never the disabled attribute…
  await expect(account).toHaveAttribute('aria-disabled', 'true');
  await expect(account).not.toHaveAttribute('disabled', /.*/);
  // …so it stays focusable and in the Tab sequence
  await account.focus();
  await expect(account).toBeFocused();
  await expect(account).toHaveAttribute('tabindex', '0');

  // dispatch past Playwright's actionability check, which honours aria-disabled
  await account.dispatchEvent('click');
  await expect(account).toHaveAttribute('aria-expanded', 'true');
});

test('header actions are focusable without breaking the toggle', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Header actions' });
  const platform = card.getByRole('button', { name: 'Platform' });
  const remove = card
    .locator('.oge-accordion-item', { hasText: 'Platform' })
    .getByRole('button', { name: 'Remove' });

  // the action button is a real sibling control, not nested in the toggle
  await expect(remove).toBeVisible();
  await platform.focus();
  await page.keyboard.press('Tab');
  await expect(remove).toBeFocused();

  await remove.click();
  await expect(platform).toHaveCount(0);
});

test('expandInvalid opens every failing section', async ({ page }) => {
  await page.goto('/components/accordion');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Invalid sections' });

  await card.getByRole('button', { name: 'Show all errors' }).click();
  await expect(card.getByRole('button', { name: /Billing/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(card.getByRole('button', { name: /Shipping/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(card.getByRole('button', { name: /Contact/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('the content loader shows a skeleton and then the payload', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Async content loader' });

  await card.getByRole('button', { name: /Invoices/ }).click();
  await expect(card.locator('.oge-accordion-skeleton')).toBeVisible();
  await expect(card.getByText('42 invoices loaded.')).toBeVisible();
});

test('collapsing a panel that holds focus hands focus to its header', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Panel-level control' });
  const profile = card.getByRole('button', { name: /Profile/ });

  await profile.click();
  const cancel = card.getByRole('button', { name: 'Cancel' });
  await cancel.focus();
  await expect(cancel).toBeFocused();

  // the action row lives inside the panel, which turns inert on collapse
  await cancel.click();
  await expect(profile).toHaveAttribute('aria-expanded', 'false');
  await expect(profile).toBeFocused();
});

test('per-panel two-way expanded drives the panel from outside', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page
    .locator('app-demo-card')
    .filter({ hasText: 'Panel-level control' });
  const profile = card.getByRole('button', { name: /Profile/ });
  const binding = card.getByRole('checkbox');

  await binding.check();
  await expect(profile).toHaveAttribute('aria-expanded', 'true');
  await binding.uncheck();
  await expect(profile).toHaveAttribute('aria-expanded', 'false');

  // and the write-back: toggling the header updates the binding
  await profile.click();
  await expect(binding).toBeChecked();
});

test('accordion overview has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/accordion');
  await expect(page.locator('.oge-accordion-toggle').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-accordion')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
