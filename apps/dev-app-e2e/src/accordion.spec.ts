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
  // The first demo is deliberately collapsible now — this contract lives in
  // the "Single, multiple & collapsible" demo, whose switches start off.
  await page.goto('/components/accordion');
  const demo = page.locator(
    'app-demo-card:has(#single-multiple-collapsible) .oge-accordion',
  );
  const general = demo.getByRole('button', { name: /General/ });
  await general.scrollIntoViewIfNeeded();

  await general.click();
  await expect(general).toHaveAttribute('aria-expanded', 'true');
  // APG: aria-disabled, never the disabled attribute…
  await expect(general).toHaveAttribute('aria-disabled', 'true');
  await expect(general).not.toHaveAttribute('disabled', /.*/);
  // …so it stays focusable and in the Tab sequence
  await general.focus();
  await expect(general).toBeFocused();
  await expect(general).toHaveAttribute('tabindex', '0');

  // dispatch past Playwright's actionability check, which honours aria-disabled
  await general.dispatchEvent('click');
  await expect(general).toHaveAttribute('aria-expanded', 'true');
});

test('the first demo toggles closed — collapsible by default', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const first = page.locator('.oge-accordion').first();
  const account = first.getByRole('button', { name: /Account/ });

  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'false');
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

test('the panel bar nests disclosure groups, selects leaves and walks by keyboard', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page.locator('app-demo-card:has(#panel-bar-nested)');
  const bar = card.locator('oge-panel-bar');
  await bar.scrollIntoViewIfNeeded();
  const header = (id: string) => bar.locator(`[data-node-id="${id}"]`);

  // no tree roles: the APG disclosure pattern
  await expect(bar.locator('[role="tree"], [role="treeitem"]')).toHaveCount(0);
  await expect(header('mail')).toHaveAttribute('aria-expanded', 'true');
  await expect(header('inbox')).toHaveAttribute('aria-current', 'true');

  // a collapsed group's children are not rendered until it opens
  await expect(header('archive')).toHaveCount(0);
  await header('projects').click();
  await expect(header('projects')).toHaveAttribute('aria-expanded', 'true');
  await expect(header('archive')).toBeVisible();

  await header('sent').click();
  await expect(header('sent')).toHaveAttribute('aria-current', 'true');
  await expect(card.locator('[data-testid="panel-bar-selected"]')).toHaveText(
    'Selected: sent',
  );

  // Right enters an open group, Left climbs back, Down skips disabled
  await header('projects').focus();
  await page.keyboard.press('ArrowRight');
  await expect(header('active')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(header('projects')).toBeFocused();
  await header('sent').focus();
  await page.keyboard.press('ArrowDown');
  await expect(header('projects')).toBeFocused(); // spam is disabled

  // single mode closes the open sibling
  await card.getByLabel('single').check();
  // both groups are open from the steps above: close mail, then reopen it
  await header('mail').click();
  await expect(header('mail')).toHaveAttribute('aria-expanded', 'false');
  await header('mail').click();
  await expect(header('mail')).toHaveAttribute('aria-expanded', 'true');
  await expect(header('projects')).toHaveAttribute('aria-expanded', 'false');
});

test('the expansion panel is an APG disclosure with header actions', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const card = page.locator('app-demo-card:has(#expansion-panel)');
  const shipping = card.getByRole('button', { name: /Shipping address/ });
  await shipping.scrollIntoViewIfNeeded();

  await expect(shipping).toHaveAttribute('aria-expanded', 'true');
  const region = card.locator(
    `#${await shipping.getAttribute('aria-controls')}`,
  );
  await expect(region).toHaveAttribute('role', 'region');
  await expect(region).toContainText('221B Baker Street');

  await shipping.click();
  await expect(shipping).toHaveAttribute('aria-expanded', 'false');
  await expect(card.locator('[data-testid="expansion-panel-log"]')).toHaveText(
    'expanded: false · last event: closed',
  );
  await shipping.press('Enter');
  await expect(shipping).toHaveAttribute('aria-expanded', 'true');

  // the action is a real button beside the toggle
  await card.getByRole('button', { name: 'Edit' }).click();
  await expect(
    card.locator('[data-testid="expansion-panel-log"]'),
  ).toContainText('edit clicked');
  await expect(shipping).toHaveAttribute('aria-expanded', 'true');

  const archived = card.getByRole('button', { name: /Archived addresses/ });
  await expect(archived).toHaveAttribute('aria-disabled', 'true');
});

test('accordion overview has no axe violations', async ({ page }) => {
  test.slow();
  await page.goto('/components/accordion');
  await expect(page.locator('.oge-accordion-toggle').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.oge-accordion')
    .include('.oge-panel-bar')
    .include('.oge-expansion-panel')
    .disableRules(['color-contrast'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
