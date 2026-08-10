import { expect, test } from '@playwright/test';

/** The routed demo: URL ↔ activeKey ↔ aria-current, tabs-routed style. */

test('deep link marks the matching item with aria-current', async ({
  page,
}) => {
  await page.goto('/components/menubar/routed/members');
  const bar = page.locator('[role="menubar"]').first();
  await expect(bar.locator('[aria-current="page"]')).toHaveText(/Members/);
  await expect(page.locator('app-menubar-routed-members')).toBeVisible();
});

test('clicking navigates and browser Back moves aria-current with it', async ({
  page,
}) => {
  await page.goto('/components/menubar/routed');
  await expect(page).toHaveURL(/\/routed\/overview$/); // bare URL redirects
  const bar = page.locator('[role="menubar"]').first();

  await bar.getByRole('menuitem', { name: 'Members' }).click();
  await expect(page).toHaveURL(/\/routed\/members$/);
  await expect(bar.locator('[aria-current="page"]')).toHaveText(/Members/);

  // A submenu leaf navigates too.
  await bar.getByRole('menuitem', { name: 'Reports' }).click();
  await page.locator('.oge-menu-item', { hasText: 'All reports' }).click();
  await expect(page).toHaveURL(/\/routed\/reports$/);
  await expect(page.locator('app-menubar-routed-reports')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/routed\/members$/);
  await expect(bar.locator('[aria-current="page"]')).toHaveText(/Members/);
});

test('url items are real links', async ({ page }) => {
  await page.goto('/components/menubar/routed');
  const link = page
    .locator('[role="menubar"]')
    .first()
    .locator('a[role="menuitem"]', { hasText: 'Members' });
  await expect(link).toHaveAttribute(
    'href',
    '/components/menubar/routed/members',
  );
});
